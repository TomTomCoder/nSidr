import { useCallback, useMemo, useState } from 'react';
import type { IQueryValidatorKey, IQueryFormContext } from './QueryFormContext';
import { QueryFormContext } from './QueryFormContext';

export const QueryFormProvider = (props: { children: React.ReactNode }) => {
  const [validators, setValidators] = useState<IQueryFormContext['validators']>({
    join: undefined,
    select: undefined,
    groupBy: undefined,
    orderBy: undefined,
    where: undefined,
    limit: undefined,
    offset: undefined,
    aggregation: undefined,
    from: undefined,
  });

  const registerValidator = useCallback((key: IQueryValidatorKey, fn?: () => boolean) => {
    setValidators((prev) => ({ ...prev, [key]: fn }));
  }, []);

  const value = useMemo(() => ({ validators, registerValidator }), [validators, registerValidator]);

  return <QueryFormContext.Provider value={value}>{props.children}</QueryFormContext.Provider>;
};
