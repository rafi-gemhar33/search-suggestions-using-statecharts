import { Machine, assign } from "xstate";
import { fetchSuggestions } from "../api";

const MIN_LENGTH = 3;

export const autocompleteInputMachine = Machine(
  {
    id: "autocomplete-input",
    initial: "idle",
    context: {
      query: "",
      message: "",
      suggestions: [],
      activeSuggestionIndex: -1,
    },
    on: {
      submit: {
        target: "search",
        cond: "hasValue",
      },
    },
    states: {
      idle: {
        id: "idle",
        on: {
          CHANGE: { target: "checkValue", actions: "saveQuery" },
        },
      },
      checkValue: {
        id: "checkValue",
        always: [{ target: "fetch", cond: "hasMinLength" }, { target: "idle" }],
      },
      fetch: {
        id: "fetch",
        invoke: {
          id: "fetch",
          src: "fetchSuggestions",
          onDone: {
            target: "validateSuggestions",
            actions: assign({
              suggestions: (context, event) => event.data,
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              message: (context, event) => event.data,
            }),
          },
        },
        on: {
          CHANGE: { target: "checkValue", actions: "saveQuery" },
        },
      },
      error: {
        on: {
          CHANGE: { target: "checkValue", actions: "saveQuery" },
        },
      },
      validateSuggestions: {
        always: [
          { target: "suggestions", cond: "hasSuggestions" },
          { target: "idle" },
        ],
      },
      suggestions: {
        initial: "inactive",
        entry: "saveLastQuery",
        exit: "deleteLastQuery",
        on: {
          CHANGE: { target: "#checkValue", actions: "saveQuery" },
          click: {
            target: "search",
            cond: "hasQuery",
          },
        },
        states: {
          inactive: {
            exit: "resetActiveSuggestionIndex",
            on: {
              keyup: [
                {
                  target: "active",
                  cond: "isArrowUpKey",
                  actions: ["activatePrev"],
                },
                {
                  target: "active",
                  cond: "isArrowDownKey",
                  actions: ["activateNext"],
                },
              ],
            },
          },
          active: {
            on: {
              keyup: [
                {
                  target: "inactive",
                  cond: "isArrowUpKeyAndFirstItemActive",

                },
                {
                  target: "inactive",
                  cond: "isArrowDownKeyAndLastItemActive",

                },
                {
                  target: "active",
                  cond: "isArrowUpKey",
                  actions: "activatePrev",
                },
                {
                  target: "active",
                  cond: "isArrowDownKey",
                  actions: "activateNext",
                },
              ],
            },
          },
        },
      },
      search: {
        id: "search",
        type: "final",
        entry: "setQuery",
      },
    },
  },
  {
    actions: {
      resetActiveSuggestionIndex: assign({
        activeSuggestionIndex: -1,
      }),
      saveQuery: assign({
        query: (context, event) => event.value,
      }),
      saveLastQuery: assign({
        prevQuery: (context, event) => context.query,
      }),
      deleteLastQuery: assign({
        prevQuery: undefined,
      }),
      activateNext: assign({
        activeSuggestionIndex: (context, event) => {
          let index = context.activeSuggestionIndex || 0;
          index = index + 1;
          if (index > context.suggestions.length - 1) {
            index = 0;
          }

          return index;
        },
      }),
      activatePrev: assign({
        activeSuggestionIndex: (context, event) => {
          let index = context.activeSuggestionIndex || 0;
          index = index - 1;
          if (index < 0) {
            index = context.suggestions.length - 1;
          }

          return index;
        },
      }),
      setQuery: assign({
        query: (context, event) => event.query,
      }),
    },
    guards: {
      hasMinLength: (context, event) =>
        context.query && context.query.length >= MIN_LENGTH,
      hasValue: (context, event) => context.query && context.query !== "",
      hasSuggestions: (context) => context.suggestions.length,
      isArrowDownKey: (context, event) => event.key === "ArrowDown",
      isArrowUpKey: (context, event) => event.key === "ArrowUp",
      isArrowDownKeyAndLastItemActive: (context, event) =>
        event.key === "ArrowDown" &&
        context.activeSuggestionIndex === context.suggestions.length - 1,
      isArrowUpKeyAndFirstItemActive: (context, event) =>
        event.key === "ArrowUp" && context.activeSuggestionIndex === 0,
      hasQuery: (context, event) => event.query,
    },
    services: {
      fetchSuggestions: (context) =>
        fetchSuggestions({ query: context.query, errorRate: 0.25 }),
    },
  }
);
