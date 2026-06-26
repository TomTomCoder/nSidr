import type { Doc } from 'sharedb/lib/client';

export type IInstanceAction<T> =
  | { type: 'update'; doc: Doc<T> }
  | { type: 'ready'; results: Doc<T>[]; extra: unknown }
  | { type: 'insert'; docs: Doc<T>[]; index: number }
  | { type: 'remove'; docs: Doc<T>[]; index: number }
  | { type: 'removeByIds'; ids: string[] }
  | { type: 'move'; docs: Doc<T>[]; from: number; to: number }
  | { type: 'clear' }
  | { type: 'extra'; extra: unknown }
  | { type: 'initSeed'; data: T[] };

export interface IInstanceState<R> {
  instances: R[];
  extra: unknown;
}

const hasDocData = <T>(doc: Doc<T>): doc is Doc<T> & { data: T } => {
  return doc.data != null;
};

export function instanceReducer<T, R extends { id: string }>(
  state: IInstanceState<R>,
  action: IInstanceAction<T>,
  factory: (data: T, doc?: Doc<T>) => R
): IInstanceState<R> {
  switch (action.type) {
    case 'update': {
      if (!hasDocData(action.doc)) {
        return state;
      }

      return {
        ...state,
        instances: state.instances.map((instance) => {
          if (instance.id === action.doc.id) {
            return factory(action.doc.data, action.doc);
          }
          return instance;
        }),
      };
    }
    case 'ready': {
      const readyResults = action.results.filter(hasDocData);
      // Short-circuit: if ShareDB confirms the exact same id sequence we already
      // hold AND every current instance has a doc attached (i.e. this isn't a
      // first-ready after SSR-seed), preserve instance identity so consumers
      // (grid, field list, view list) don't re-render. This is the hot path on
      // reconnect and on schemaRefreshToken bumps.
      if (
        state.instances.length === readyResults.length &&
        state.instances.every(
          // Match by id AND by exact doc identity. Same-id but different doc
          // (e.g. schemaRefreshToken-driven re-subscribe) must fall through to
          // rebuild so consumers see fresh data.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (inst, i) => inst.id === readyResults[i].id && (inst as any).doc === readyResults[i]
        )
      ) {
        return state.extra === action.extra ? state : { ...state, extra: action.extra };
      }
      return {
        ...state,
        instances: readyResults.map((r) => factory(r.data, r)),
        extra: action.extra,
      };
    }
    case 'insert':
      return {
        ...state,
        instances: [
          ...state.instances.slice(0, action.index),
          ...action.docs.filter(hasDocData).map((doc) => factory(doc.data, doc)),
          ...state.instances.slice(action.index),
        ],
      };
    case 'remove':
      return {
        ...state,
        instances: [
          ...state.instances.slice(0, action.index),
          ...state.instances.slice(action.index + action.docs.length),
        ],
      };
    case 'removeByIds': {
      const deletedIds = new Set(action.ids);
      return {
        ...state,
        instances: state.instances.filter((instance) => !deletedIds.has(instance.id)),
      };
    }
    case 'move': {
      const { docs, from, to } = action;
      const newInstances = [...state.instances];
      const moveInstances = newInstances.splice(from, docs.length);
      newInstances.splice(to, 0, ...moveInstances);
      return {
        ...state,
        instances: newInstances,
      };
    }
    case 'clear': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (state.instances[0] && (state.instances[0] as any).doc) {
        return {
          ...state,
          instances: [],
          extra: undefined,
        };
      }
      return state;
    }
    case 'initSeed': {
      // Immediately populate instances from cached/prefetched data while ShareDB subscribes.
      // These instances have no .doc attached — the 'ready' action will replace them once
      // ShareDB confirms the live state. Used on table-switch when REST cache is available.
      return {
        ...state,
        instances: action.data.map((data) => factory(data)),
        extra: undefined,
      };
    }
    case 'extra': {
      return {
        ...state,
        extra: action.extra,
      };
    }
    default:
      return state;
  }
}
