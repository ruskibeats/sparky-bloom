-- Sato Intelligence Card Interactions
-- Tracks card lifecycle events: impression, opened, dismissed, marked_useful, marked_not_useful

CREATE TABLE IF NOT EXISTS t1d_card_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id TEXT NOT NULL,
    t1d_profile_id UUID REFERENCES t1d_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('impression', 'opened', 'primary_action', 'secondary_action', 'dismissed', 'marked_useful', 'marked_not_useful')),
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_t1d_card_interactions_user_id ON t1d_card_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_t1d_card_interactions_t1d_profile_id ON t1d_card_interactions(t1d_profile_id);
CREATE INDEX IF NOT EXISTS idx_t1d_card_interactions_card_id ON t1d_card_interactions(card_id);
CREATE INDEX IF NOT EXISTS idx_t1d_card_interactions_action ON t1d_card_interactions(action);
CREATE INDEX IF NOT EXISTS idx_t1d_card_interactions_created_at ON t1d_card_interactions(created_at DESC);