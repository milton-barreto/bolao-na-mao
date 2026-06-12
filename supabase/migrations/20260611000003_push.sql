-- =============================================================
-- Migration: Web Push Notifications
-- Tabelas: push_subscriptions, push_queue
-- Funções: check_deadline_reminders, queue_ranking_notifications,
--          process_push_queue
-- =============================================================

-- ── push_subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   text NOT NULL,
  p256dh     text NOT NULL,
  auth_key   text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: own"
  ON push_subscriptions FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── push_queue ────────────────────────────────────────────────
-- dedup_key garante no máximo 1 notificação por (user, chave) por janela.
-- Ex: 'ranking-2026-06-11-15' = 1 ranking push por user por hora.
-- Ex: 'deadline-{match_id}'   = 1 deadline push por user por jogo.
CREATE TABLE IF NOT EXISTS push_queue (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,
  payload    jsonb NOT NULL,
  dedup_key  text,
  created_at timestamptz DEFAULT now(),
  sent_at    timestamptz,
  UNIQUE(user_id, dedup_key)
);

-- Apenas service_role acessa a fila
ALTER TABLE push_queue ENABLE ROW LEVEL SECURITY;

-- ── Colunas extras em profiles ────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_rank int;

-- ── check_deadline_reminders ──────────────────────────────────
-- Chamada pelo Edge Function send-push a cada 2min.
-- Insere na fila usuários sem palpite em jogos que fecham em ~30min.
CREATE OR REPLACE FUNCTION check_deadline_reminders()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match  RECORD;
  v_sub    RECORD;
  v_count  int := 0;
BEGIN
  FOR v_match IN
    SELECT m.id, m.round_number,
           ht.name AS home_name,
           at.name AS away_name
    FROM   matches m
    JOIN   teams ht ON ht.id = m.home_team_id
    JOIN   teams at ON at.id = m.away_team_id
    WHERE  m.status = 'scheduled'
      AND  m.deadline_at BETWEEN now() + interval '25 minutes'
                             AND now() + interval '35 minutes'
  LOOP
    FOR v_sub IN
      SELECT ps.user_id
      FROM   push_subscriptions ps
      WHERE  NOT EXISTS (
               SELECT 1 FROM bets b
               WHERE  b.user_id  = ps.user_id
                 AND  b.match_id = v_match.id
             )
    LOOP
      INSERT INTO push_queue (user_id, type, payload, dedup_key)
      VALUES (
        v_sub.user_id,
        'deadline',
        jsonb_build_object(
          'title', '⚽ Fecha em 30min!',
          'body',  v_match.home_name || ' × ' || v_match.away_name || ' — vai sem palpite?',
          'url',   '/grupos/rodada/' || COALESCE(v_match.round_number::text, '1')
        ),
        'deadline-' || v_match.id::text
      )
      ON CONFLICT (user_id, dedup_key) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ── queue_ranking_notifications ───────────────────────────────
-- Chamada pelo trigger após recalc_match_bets.
-- Enfileira 1 notificação de ranking por user por hora (via dedup_key).
CREATE OR REPLACE FUNCTION queue_ranking_notifications()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total  int;
  v_user   RECORD;
  v_msg    text;
  v_hour   text;
BEGIN
  SELECT COUNT(*) INTO v_total FROM profiles;
  IF v_total = 0 THEN RETURN; END IF;

  -- Chave de hora (UTC-3) para dedup de ranking
  v_hour := to_char(now() AT TIME ZONE 'America/Fortaleza', 'YYYY-MM-DD-HH24');

  FOR v_user IN
    WITH ranked AS (
      SELECT
        p.id,
        p.last_rank,
        CAST(RANK() OVER (
          ORDER BY COALESCE(SUM(b.total_points), 0) DESC, p.id
        ) AS int) AS new_rank
      FROM   profiles p
      LEFT JOIN bets b ON b.user_id = p.id
      GROUP BY p.id, p.last_rank
    )
    SELECT r.*,
           EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = r.id) AS has_sub
    FROM ranked r
  LOOP
    CONTINUE WHEN NOT v_user.has_sub;

    -- Mensagem baseada na mudança de posição
    IF v_user.last_rank IS NULL THEN
      v_msg := '⚽ Você estreia em ' || v_user.new_rank || 'º! Bora subir no ranking!';
    ELSIF v_user.new_rank < v_user.last_rank THEN
      v_msg := '📈 Subiu para ' || v_user.new_rank || 'º! Continua assim! 🔥';
    ELSIF v_user.new_rank > v_user.last_rank THEN
      IF v_user.new_rank = v_total THEN
        v_msg := '😬 Lanterninha por agora... Copa é longa! 🙏';
      ELSE
        v_msg := '📉 Caiu pra ' || v_user.new_rank || 'º... Mas ainda dá pra virar! 💪';
      END IF;
    ELSE
      -- Manteve posição
      IF v_user.new_rank = 1 THEN
        v_msg := '🏆 Segura o 1º lugar! Tá dominando o bolão!';
      ELSIF v_user.new_rank <= 3 THEN
        v_msg := '🥇 No pódio em ' || v_user.new_rank || 'º! Não para! 🔥';
      ELSIF v_user.new_rank = v_total THEN
        v_msg := '😅 Ainda no fundo... Mas a Copa mal começou! 💡';
      ELSE
        v_msg := '💛 Firme em ' || v_user.new_rank || 'º! Continua palpitando!';
      END IF;
    END IF;

    INSERT INTO push_queue (user_id, type, payload, dedup_key)
    VALUES (
      v_user.id,
      'ranking',
      jsonb_build_object(
        'title', 'Ranking atualizado! 📊',
        'body',  v_msg,
        'url',   '/ranking'
      ),
      'ranking-' || v_hour
    )
    ON CONFLICT (user_id, dedup_key) DO UPDATE
      SET payload = EXCLUDED.payload;

    UPDATE profiles
    SET    last_rank = v_user.new_rank
    WHERE  id = v_user.id;
  END LOOP;
END;
$$;

-- ── process_push_queue ────────────────────────────────────────
-- Retorna ≤50 itens não enviados + marca como enviados atomicamente.
-- Chamada pelo Edge Function para obter o que precisa enviar.
CREATE OR REPLACE FUNCTION process_push_queue()
RETURNS TABLE(
  user_id  uuid,
  endpoint text,
  p256dh   text,
  auth_key text,
  title    text,
  body     text,
  url      text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH items AS (
    SELECT pq.id, pq.user_id, pq.payload
    FROM   push_queue pq
    WHERE  pq.sent_at IS NULL
    ORDER  BY pq.created_at
    LIMIT  50
    FOR UPDATE OF pq SKIP LOCKED
  ),
  marked AS (
    UPDATE push_queue pq2
    SET    sent_at = now()
    FROM   items
    WHERE  pq2.id = items.id
    RETURNING pq2.id, pq2.user_id, pq2.payload
  )
  SELECT
    m.user_id,
    ps.endpoint,
    ps.p256dh,
    ps.auth_key,
    (m.payload->>'title')::text,
    (m.payload->>'body')::text,
    (m.payload->>'url')::text
  FROM   marked m
  JOIN   push_subscriptions ps ON ps.user_id = m.user_id;
END;
$$;

-- Grant para service_role (Edge Function usa service role key)
GRANT EXECUTE ON FUNCTION check_deadline_reminders()  TO service_role;
GRANT EXECUTE ON FUNCTION queue_ranking_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION process_push_queue()         TO service_role;
GRANT ALL ON push_subscriptions TO service_role;
GRANT ALL ON push_queue         TO service_role;

-- ── Atualizar trigger para enfileirar ranking após recalc ──────
-- NOTA PÓS-DEPLOY: agendar a Edge Function send-push a cada 2min
-- via Supabase Dashboard → Edge Functions → send-push → Schedule → */2 * * * *
CREATE OR REPLACE FUNCTION trigger_recalc_on_finish()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.status = 'finished' AND (
    old.status IS DISTINCT FROM 'finished'
    OR new.home_score IS DISTINCT FROM old.home_score
    OR new.away_score IS DISTINCT FROM old.away_score
  ) THEN
    PERFORM recalc_match_bets(new.id);
    PERFORM queue_ranking_notifications();
  END IF;
  RETURN new;
END;
$$;
