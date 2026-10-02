import type { HistoryEvent } from '@/components/ui/games/word-card';

export type GamePresentation =
    | 'playing'
    | 'feedback_correct'
    | 'feedback_wrong'
    | 'time_up'
    | 'result'
    | 'next_word';

export type ScheduledPresentation = {
    presentation: GamePresentation;
    starts_at: string;
    ends_at: string | null;
};

export type PublicGameRoom = {
    id: string;
    code: string;
    host: string;
    capacity: number;
    players_count: number;
    status: 'waiting' | 'countdown';
    starts_at: string | null;
};

export type GameParticipant = {
    id: number;
    user_id: number;
    name: string;
    seat: number;
    color: string;
    score: number;
    used: boolean;
};

export type GameSnapshot = {
    room: {
        id: string;
        code: string;
        capacity: number;
        status: 'waiting' | 'countdown' | 'playing' | 'finished';
        phase: 'translation' | 'grammar' | 'conjugation' | 'done';
        presentation: GamePresentation;
        presentation_timeline: ScheduledPresentation[];
        version: number;
        starts_at: string | null;
        started_at: string | null;
        round_ends_at: string | null;
        answer_ends_at: string | null;
        presentation_started_at: string | null;
        presentation_ends_at: string | null;
        next_word_at: string | null;
        word_index: number;
        word_count: number;
    };
    participants: GameParticipant[];
    viewer_participant_id: number | null;
    game: {
        word: string | null;
        active_participant_id: number | null;
        message: string;
        answer_preview: string;
        submitted_answer: string | null;
        grammar_selection: 'fort' | 'faible' | null;
        history: HistoryEvent[];
        correction: {
            translation: string;
            strength: 'fort' | 'faible';
            conjugation: string;
        } | null;
    };
    server_time: string;
};
