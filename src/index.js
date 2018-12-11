import { useState, useMemo } from "react";
import { createValidator, getPayload, ValidatorError } from "validator-creator";
export * from "validator-creator";

const initialState = {};
const initialChanges = {};

function merge(...args) {
  let result = {};
  for (let arg of args) {
    result = {
      ...result,
      ...Object.entries(arg).reduce((o, [k, v]) => {
        if (v === null) {
          return o;
        }
        return { ...o, [k]: v };
      }, {})
    };
  }
  return result;
}

function update(setState, change) {
  return new Promise(resolve =>
    setState(prevState => {
      const nextState = { ...prevState, ...change };
      resolve(nextState);
      return nextState;
    })
  );
}

export function ignoreValidatorError(error) {
  if (!(error instanceof ValidatorError)) {
    throw error;
  }
}

export default function(rules, rules1 = {}) {
  const [state0, setState0] = useState(initialState);
  const [state1, setState1] = useState(initialState);
  const [, setChanges] = useState(initialChanges);
  const validate0 = useMemo(() => createValidator(rules), []);
  const validate1 = useMemo(() => createValidator(rules1), []);
  const messages = useMemo(() => merge(state0, state1), [state0, state1]);
  const validate = async (change = null, ...args) => {
    const changes = await update(setChanges, change);
    const payload0 = await validate0(change, ...args).then(getPayload);
    const payload1 = await validate1(changes, ...args).then(getPayload);
    return merge(
      ...(await Promise.all([
        update(setState0, payload0),
        update(setState1, payload1)
      ]))
    );
  };
  validate.reset = () => {
    setState0(initialState);
    setState1(initialState);
    setChanges(initialChanges);
  };
  return [messages, validate];
}
