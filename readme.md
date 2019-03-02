# React Validator Hook

A React Hook to handle form validation messages.

Features:

- multiple rules per field
- asynchronous rules with built-in concurrency prevention
- BYO rules and display logic

## Install

```sh
npm i react-use-validator
```

## Usage

See [validator-creator](https://github.com/ttoohey/validator-creator) for
background information about validator rules.

```js
import React, { useState } from "react";
import useValidator, { createRule } from "react-use-validator";

const initialFormData = {
  field1: "",
  field2: ""
};

// A rule defines how a value should be validated. This is a rule that ensures
// string values aren't empty.
const filled = createRule("filled", value => value.length > 0, "Required");

function ExampleForm() {
  const [formData, setFormData] = useState(initialFormData);

  // useValidator() accepts a "rule collection" listing the validation rules
  // to apply to each field.
  // The `messages` element contains the messages for fields that have failed.
  // The `validate` element is a function used to perform a validation.
  const [messages, validate] = useValidator({
    field1: [filled],
    field2: [filled]
  });

  function handleChange({ target: { name, value } }) {
    const change = { [name]: value };
    setFormData({ ...formData, ...change });
    // the change is validated which will update `messages` if there's a change
    // to the validation results
    validate(change);
  }

  async function handleSubmit() {
    // the whole form is validated prior to submitting
    const messages = await validate(formData);
    if (
      Object.entries(messages).filter(([prop, result]) => result !== null)
        .length > 0
    ) {
      // abort as there's at least one non-null message
      return;
    }
    // continue as there are no validation messages
    await API.submit(formData); // or something
  }

  return (
    <div>
      <div>
        <label>Field 1</label>
        <input name="field1" value={formData.field1} onChange={handleChange} />
        // The message output will display "Required" from the `filled` rule if
        // the input value is empty
        <span>{messages.field1}</span>
      </div>
      <div>
        <label>Field 2</label>
        <input name="field2" value={formData.field2} onChange={handleChange} />
        <span>{messages.field2}</span>
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

## Asynchronous rules

The validator handles asynchronous validation rules (such as server-side
validation), but some care is required.

An asynchronous rule can be created using the `createAsyncRule` function.

```js
import { createAsyncRule } from "react-use-validator";
import API from "./api";

// createAsyncRule(validate, payload) is used to create a rule function
// The `validate` argument is a callback provided by your app. It should return
// a promise that resolves with a list of validation results. A validation result
// is an object with shape `{ type, prop }` which identifies the rule (`type`) and
// field (`prop`) that triggered the error
// The `payload` argument allows control over the error message.
const server = createAsyncRule(
  change => API.validate(change),
  ({ type, prop }) => `Error from server`
);
```

The rule can be added to a rule collection in the same way as for synchronous
rules.

```js
const rules = {
  field1: [filled, server],
  field2: [filled, server]
};
```

- Rules are executed in the order they appear in the rule collection, stopping
  at the first one that returns a non-null response.
- Asynchronous rules will only be called once per validation.

The `validate()` function returned by `useValidator` will prevent concurrent
calls to the same rule by throwing a ValidatorError exception if a call is
interrupted. This exception should be caught (and usually ignored) by the
Component

```js
function ignoreValidatorError(error) {
  if (!(error instanceof ValidatorError)) {
    throw error;
  }
}

async function handleChange({ target: { name, value } }) {
  const change = { [name]: value };
  setFormData({ ...formData, ...change });
  await validate(change).catch(ignoreValidatorError);
}
```

If a "submit" event occurs while an asynchronous validation is still in progress
the event handler can block until the validation completes by calling
`validate()` with no arguments. Again, `ValidatorError` exceptions should be
caught and used to prevent further execution of the handler.

```js
async function handleSubmit() {
  try {
    const messages = await validate();
    // ... check if there are any messages ...
  } catch (error) {
    return ignoreValidatorError(error);
  }
  // ... continue submitting data ...
}
```

Even after all validation rules have passed, submitting form data to the server
may still fail. If the server response contains a list of errors with
validation results (`{ type, prop }` objects) the validator can be re-run
providing those errors so that another network request isn't needed.

```js
async function handleSubmit() {
  // ... check there are no messages ...
  const response = await API.submit(formData);
  if (response.errors) {
    // inject server errors into the validator
    await validate(formData, [[server, response.errors]]);
  } else {
    // ... handle successful submit ...
  }
}
```
