import { useState, useMemo } from "react";
import { createValidator, getPayload } from "validator-creator";
export * from "validator-creator";

const initialState = {};
const noChange = {};

export default function(rules) {
  const [state, setState] = useState(initialState);
  const validate = useMemo(() => createValidator(rules), []);
  return [
    state,
    async (change = noChange, ...args) => {
      if (change === null) {
        setState(initialState);
        return initialState;
      }
      const payload = await validate(
        change === noChange ? null : change,
        ...args
      ).then(getPayload);
      return new Promise(resolve =>
        setState(prevState => {
          const nextState = { ...prevState, ...payload };
          setState(nextState);
          resolve(nextState);
        })
      );
    }
  ];
}
