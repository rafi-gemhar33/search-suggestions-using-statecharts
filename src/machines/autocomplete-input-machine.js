import { Machine, assign } from "xstate";
import { fetchSuggestions } from "../api";

const MIN_LENGTH = 3;

export const autocompleteInputMachine = Machine(
  {
    id: "autocomplete-input",
    initial: "idle",
    context: {
      typedQuery: "",
      message: "",
      suggestions: [],
      activeSuggestionIndex: -1
    },
    on: {
      SEARCH: {
        target: "search",
        cond: "hasValue"
      }
    },
    states: {
      idle: {
        id: "idle",

        on: {
          CHANGE: "checkValue"
        }
      },
      checkValue: {
        id: "checkValue",
        entry: "saveTypedQuery",
        always: [{ target: "fetch", cond: "hasMinLength" }, { target: "idle" }]
      },
      fetch: {
        id: "fetch",
        invoke: {
          id: "fetch",
          src: "fetchSuggestions",
          onDone: {
            target: "validateSuggestions",
            actions: assign({
              suggestions: (context, event) => event.data
            })
          },
          onError: {
            target: "error",
            actions: assign({
              message: (context, event) => event.data
            })
          }
        },
        on: {
          CHANGE: "checkValue"
        }
      },
      error: {
        on: {
          CHANGE: "checkValue"
        }
      },
      validateSuggestions: {
        always: [
          { target: "suggestions", cond: "hasSuggestions" },
          { target: "idle" }
        ]
      },
      suggestions: {
        initial: "inactive",
        states: {
          inactive: {
            entry: "setPreviouslyTypedQuery",
            exit: "resetActiveSuggestionIndex",
            on: {
              SEARCH: [
                { target: "#search", cond: "hasQuery" },
                { target: "#search", cond: "hasValue" },
                { target: "inactive" }
              ],
              keyup: [
                {
                  target: "active",
                  cond: "isArrowUpKey",
                  actions: "activatePrev"
                },
                {
                  target: "active",
                  cond: "isArrowDownKey",
                  actions: "activateNext"
                }
              ]
            }
          },
          active: {
            on: {
              SEARCH: [
                { target: "#search", cond: "hasQuery" },
                { target: "active" }
              ],
              keyup: [
                { target: "inactive", cond: "isArrowUpKeyAndFirstItemActive" },
                {
                  target: "active",
                  cond: "isArrowUpKey",
                  actions: "activatePrev"
                },
                { target: "inactive", cond: "isArrowDownKeyAndLastItemActive" },
                {
                  target: "active",
                  cond: "isArrowDownKey",
                  actions: "activateNext"
                },
                {
                  target: "#search",
                  cond: "isEnterKey",
                  actions: "setActiveQuery"
                }
              ]
            }
          }
        },
        on: {
          CHANGE: "#checkValue"
        }
      },
      search: {
        id: "search",
        type: "final",
        entry: "setFinalQuery"
      }
    }
  },
  {
    actions: {
      saveTypedQuery: assign({
        typedQuery: (context, event) => event.target && event.target.value
      }),
      resetActiveSuggestionIndex: assign({
        activeSuggestionIndex: -1
      }),
      setPreviouslyTypedQuery: assign({
        lastTypedQuery: (context, event) => context.typedQuery
      }),
      activateNext: assign({
        activeSuggestionIndex: (context, event) => {
          let index = context.activeSuggestionIndex || 0;
          index = index + 1;
          if (index > context.suggestions.length - 1) {
            index = 0;
          }

          return index;
        }
      }),
      activatePrev: assign({
        activeSuggestionIndex: (context, event) => {
          let index = context.activeSuggestionIndex || 0;
          index = index - 1;
          if (index < 0) {
            index = context.suggestions.length - 1;
          }

          return index;
        }
      }),
      setFinalQuery: assign({
        typedQuery: (context, event) => {
          if (event.query) {
            return event.query;
          }
          return context.typedQuery;
        }
      }),
      setActiveQuery: assign({
        typedQuery: (context, event) => {
          return context.suggestions[context.activeSuggestionIndex];
        }
      })
    },
    guards: {
      hasMinLength: (context, event) =>
        context.typedQuery && context.typedQuery.length >= MIN_LENGTH,
      hasValue: (context, event) =>
        context.typedQuery && context.typedQuery !== "",
      hasSuggestions: (context) => context.suggestions.length,
      isArrowDownKey: (context, event) => event.key === "ArrowDown",
      isArrowUpKey: (context, event) => event.key === "ArrowUp",
      isArrowDownKeyAndLastItemActive: (context, event) =>
        event.key === "ArrowDown" &&
        context.activeSuggestionIndex === context.suggestions.length - 1,
      isArrowUpKeyAndFirstItemActive: (context, event) =>
        event.key === "ArrowUp" && context.activeSuggestionIndex === 0,
      isEnterKey: (context, event) => event.key === "Enter",
      hasQuery: (context, event) => event.query
    },
    services: {
      fetchSuggestions: (context) =>
        fetchSuggestions({ query: context.typedQuery, errorRate: 0.25 })
    }
  }
);
