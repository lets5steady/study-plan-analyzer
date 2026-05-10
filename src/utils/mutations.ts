import type { Subject, Topic, Subtask } from '../types';

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
