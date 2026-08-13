
import type {
  InterviewDifficulty,
  InterviewQuestion,
  InterviewSession,
} from '../../types/database';

export interface AnswerRecord {
  questionId: string;
  questionIndex: number;
  questionText: string;
  difficulty: InterviewDifficulty;
  answerText: string;
  score: number | null;
  feedback: Record<string, any> | null;
  responseMs: number;
}

export interface SessionState {
  session: InterviewSession;
  questions: InterviewQuestion[];
  answers: AnswerRecord[];
}