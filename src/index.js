import { interpret } from "xstate";
import { inspect } from "@xstate/inspect";
import debounce from "debounce";
import { autocompleteInputMachine } from "./machines/autocomplete-input-machine";
import "./styles.css";

console.clear();

const elForm = document.querySelector("#search-box");
const elInput = document.querySelector("#query");
const elSuggestions = document.querySelector("#suggestion-list");
const elResults = document.querySelector("#query-results");
const elReset = document.querySelector(".reset");

const DEBUG = true;
if (DEBUG) {
  inspect({ iframe: false });
}

const service = interpret(autocompleteInputMachine, { devTools: DEBUG });

const updateSuggestions = (data, query) => {
  let html = "";

  if (Array.isArray(data) && data.length > 0) {
    data.forEach((s) => {
      const li = `<li><a href="#" data-query="${s}">${s}</a></li>`;
      html = html + li;
    });
  }
  // else {
  //   html = `<li><a href="#"  data-query="${query}">Search for <strong>"${query}"</strong></a></li>`;
  // }
  elSuggestions.innerHTML = html;
  const links = Array.from(document.querySelectorAll(".suggestions li a"));
  links.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const query = e.currentTarget && e.currentTarget.dataset.query;
      service.send({
        type: "click",
        query,
      });
    });
  });
};

const showSearchResultsMessage = (query) => {
  elResults.innerHTML = query;
};

service.onTransition((state) => {
  const currentState = state.toStrings();

  elForm.dataset.state = currentState.join(" ");

  if (state.changed) {
    if (currentState.includes("suggestions")) {
      state.context &&
        updateSuggestions(state.context.suggestions, state.context.query);
    }

    if (currentState.includes("suggestions.active")) {
      const context = state.context;
      const activeQuery =
        context && context.suggestions[context.activeSuggestionIndex];
      if (activeQuery) {
        elInput.value = activeQuery;
      }

      const elLis = Array.from(document.querySelectorAll(".suggestions li a"));
      elLis.forEach((li, i) => {
        li.dataset.active = context.activeSuggestionIndex === i;
      });
    }

    if (currentState.includes("suggestions.inactive")) {
      const lastTypedQuery = state.context && state.context.prevQuery;

      if (lastTypedQuery) {
        elInput.value = lastTypedQuery;
      }
    }

    if (currentState.includes("error")) {
      const message = state.context && state.context.message;
      if (message) {
        const elMessage = document.querySelector("#message");
        elMessage.innerHTML = message;
      }
    }

    if (currentState.includes("search")) {
      showSearchResultsMessage(state.context.query);
    }
  }
});

service.start();

elForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const query =
    event.target.elements &&
    event.target.elements.query &&
    event.target.elements.query.value;
  service.send({
    type: "submit",
    query,
  });
});

elInput.addEventListener(
  "input",
  debounce((e) => {
    const value =
      (e.currentTarget && e.currentTarget.value) ||
      (e.target && e.target.value);
    service.send({
      type: "CHANGE",
      value,
    });
  }, 200)
);

document.addEventListener("keyup", service.send);

elReset.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.reload();
});
