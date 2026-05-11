import type { Subject, Topic, Subtask, StudySession } from '../types';

// ─── Session mutations ────────────────────────────────────────────────────────

export function addSession(
  sessions: StudySession[],
  session: StudySession,
): StudySession[] {
  return [...sessions, session];
}

export function updateSession(
  sessions: StudySession[],
  id: string,
  patch: Partial<Pick<StudySession, 'date' | 'actualDurationMinutes' | 'plannedDurationMinutes' | 'memo' | 'difficulty'>>,
): StudySession[] {
  return sessions.map((s) => (s.id !== id ? s : { ...s, ...patch }));
}

export function deleteSession(sessions: StudySession[], id: string): StudySession[] {
  return sessions.filter((s) => s.id !== id);
}

/**
 * topic.actualHours をセッション合計と一致させる。
 * EVM の computeAC はセッションから直接計算するが、
 * エクスポート/インポートの整合性のためにキャッシュも維持する。
 */
export function syncTopicActualHours(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  newSessions: StudySession[],
): Subject[] {
  const total = newSessions
    .filter((s) => s.topicId === topicId && s.status === 'completed')
    .reduce((sum, s) => sum + s.actualDurationMinutes / 60, 0);
  return updateTopic(subjects, subjectId, topicId, { actualHours: total });
}

export function updateTopic(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  patch: Partial<Topic>,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId
      ? s
      : {
          ...s,
          updatedAt: new Date().toISOString(),
          topics: s.topics.map((t) =>
            t.id !== topicId ? t : { ...t, ...patch },
          ),
        },
  );
}

export function toggleSubtask(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  subtaskId: string,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId
      ? s
      : {
          ...s,
          updatedAt: new Date().toISOString(),
          topics: s.topics.map((t) =>
            t.id !== topicId
              ? t
              : {
                  ...t,
                  subtasks: t.subtasks.map((st) =>
                    st.id !== subtaskId
                      ? st
                      : { ...st, completed: !st.completed },
                  ),
                },
          ),
        },
  );
}

export function addSubtask(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  subtask: Subtask,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId
      ? s
      : {
          ...s,
          updatedAt: new Date().toISOString(),
          topics: s.topics.map((t) =>
            t.id !== topicId
              ? t
              : { ...t, subtasks: [...t.subtasks, subtask] },
          ),
        },
  );
}

export function addTopic(
  subjects: Subject[],
  subjectId: string,
  topic: Topic,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId
      ? s
      : {
          ...s,
          updatedAt: new Date().toISOString(),
          topics: [...s.topics, topic],
        },
  );
}

export function deleteSubject(subjects: Subject[], subjectId: string): Subject[] {
  return subjects.filter((s) => s.id !== subjectId);
}

export function updateSubject(subjects: Subject[], subjectId: string, patch: Partial<Subject>): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId ? s : { ...s, ...patch, updatedAt: new Date().toISOString() },
  );
}

export function updateSubtask(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  subtaskId: string,
  patch: Partial<Pick<Subtask, 'name' | 'completed' | 'type'>>,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId ? s : {
      ...s,
      updatedAt: new Date().toISOString(),
      topics: s.topics.map((t) =>
        t.id !== topicId ? t : {
          ...t,
          subtasks: t.subtasks.map((st) =>
            st.id !== subtaskId ? st : { ...st, ...patch },
          ),
        },
      ),
    },
  );
}

export function deleteSubtask(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
  subtaskId: string,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId ? s : {
      ...s,
      updatedAt: new Date().toISOString(),
      topics: s.topics.map((t) =>
        t.id !== topicId ? t : {
          ...t,
          subtasks: t.subtasks.filter((st) => st.id !== subtaskId),
        },
      ),
    },
  );
}

export function deleteTopic(
  subjects: Subject[],
  subjectId: string,
  topicId: string,
): Subject[] {
  return subjects.map((s) =>
    s.id !== subjectId
      ? s
      : {
          ...s,
          updatedAt: new Date().toISOString(),
          topics: s.topics.filter((t) => t.id !== topicId),
        },
  );
}
