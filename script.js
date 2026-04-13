/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectionsBtn = document.getElementById("clearSelectionsBtn");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* App state */
const STORAGE_KEY = "lorealSelectedProductIds";
const BEAUTY_TOPIC_REGEX =
  /(routine|skincare|skin care|haircare|hair care|makeup|fragrance|cleanser|serum|moisturizer|sunscreen|spf|hair|face|beauty|product)/i;

let allProducts = [];
let selectedProductIds = new Set();
let routineGenerated = false;
let routineText = "";
let conversationMessages = [];

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Safely insert text content into HTML strings */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* Save selected IDs so choices stay after reload */
function saveSelectedProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedProductIds)));
}

/* Load selected IDs from localStorage */
function loadSelectedProducts() {
  const savedValue = localStorage.getItem(STORAGE_KEY);
  if (!savedValue) {
    return;
  }

  try {
    const parsedIds = JSON.parse(savedValue);
    if (Array.isArray(parsedIds)) {
      selectedProductIds = new Set(parsedIds);
    }
  } catch (error) {
    console.error("Could not read saved products:", error);
  }
}

/* Return selected product objects */
function getSelectedProducts() {
  return allProducts.filter((product) => selectedProductIds.has(product.id));
}

/* Add one message bubble to the chat */
function appendChatMessage(role, text) {
  const message = document.createElement("div");
  message.className = `chat-message ${role === "user" ? "user" : "assistant"}`;
  message.textContent = text;
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* Update selected list UI */
function renderSelectedProducts() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="selected-empty">No products selected yet.</p>
    `;
    generateRoutineBtn.disabled = true;
    clearSelectionsBtn.disabled = true;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-item">
        <div class="selected-item-text">
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.brand)}</span>
        </div>
        <button
          class="remove-selected-btn"
          type="button"
          data-remove-id="${product.id}"
          aria-label="Remove ${escapeHtml(product.name)}"
        >
          Remove
        </button>
      </div>
    `
    )
    .join("");

  generateRoutineBtn.disabled = false;
  clearSelectionsBtn.disabled = false;
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products found in this category.
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      const descriptionId = `description-${product.id}`;

      return `
        <article
          class="product-card ${isSelected ? "selected" : ""}"
          data-product-id="${product.id}"
          aria-pressed="${isSelected}"
          tabindex="0"
        >
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
          <div class="product-info">
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.brand)}</p>
            <button
              type="button"
              class="description-toggle"
              aria-expanded="false"
              aria-controls="${descriptionId}"
            >
              Show description
            </button>
            <p id="${descriptionId}" class="product-description" hidden>
              ${escapeHtml(product.description)}
            </p>
          </div>
        </article>
      `;
    })
    .join("");
}

/* Toggle select/unselect state */
function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  saveSelectedProducts();
  renderSelectedProducts();

  /* Refresh category grid so selected border/highlight updates */
  if (categoryFilter.value) {
    const filteredProducts = allProducts.filter(
      (product) => product.category === categoryFilter.value
    );
    displayProducts(filteredProducts);
  }
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", (event) => {
  const selectedCategory = event.target.value;

  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Handle product card interactions with event delegation */
productsContainer.addEventListener("click", (event) => {
  const descriptionToggleButton = event.target.closest(".description-toggle");
  if (descriptionToggleButton) {
    const card = descriptionToggleButton.closest(".product-card");
    const description = card.querySelector(".product-description");
    const isExpanded = descriptionToggleButton.getAttribute("aria-expanded") === "true";

    descriptionToggleButton.setAttribute("aria-expanded", String(!isExpanded));
    descriptionToggleButton.textContent = isExpanded
      ? "Show description"
      : "Hide description";
    description.hidden = isExpanded;
    return;
  }

  if (event.target.closest(".product-description")) {
    return;
  }

  const card = event.target.closest(".product-card");
  if (!card) {
    return;
  }

  const productId = Number(card.dataset.productId);
  toggleProductSelection(productId);
});

/* Also support keyboard selection for accessibility */
productsContainer.addEventListener("keydown", (event) => {
  if (event.target.closest(".description-toggle")) {
    return;
  }

  const card = event.target.closest(".product-card");
  if (!card) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const productId = Number(card.dataset.productId);
    toggleProductSelection(productId);
  }
});

/* Remove selected item directly from the list */
selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-selected-btn");
  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.removeId);
  selectedProductIds.delete(productId);
  saveSelectedProducts();
  renderSelectedProducts();

  if (categoryFilter.value) {
    const filteredProducts = allProducts.filter(
      (product) => product.category === categoryFilter.value
    );
    displayProducts(filteredProducts);
  }
});

/* Clear all selected products */
clearSelectionsBtn.addEventListener("click", () => {
  selectedProductIds.clear();
  saveSelectedProducts();
  renderSelectedProducts();

  if (categoryFilter.value) {
    const filteredProducts = allProducts.filter(
      (product) => product.category === categoryFilter.value
    );
    displayProducts(filteredProducts);
  }
});

/* Replace with your deployed Cloudflare Worker URL */
const WORKER_URL = "https://loreal-chat-worker.roland-okungbowa1.workers.dev/";

/* Send messages to the Cloudflare Worker, which forwards them to OpenAI */
async function fetchOpenAIResponse(messages) {
  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages }),
    });

    /* Read response as text first so a non-JSON error body won't crash */
    const responseText = await response.text();

    if (!response.ok) {
      console.error("API error:", response.status, responseText);
      appendChatMessage(
        "assistant",
        "There was an error calling the API. Please try again."
      );
      return null;
    }

    const data = JSON.parse(responseText);
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Network error:", error);
    appendChatMessage(
      "assistant",
      "Network error while contacting the API. Please try again."
    );
    return null;
  }
}

/* Generate a routine from selected product JSON */
generateRoutineBtn.addEventListener("click", async () => {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    appendChatMessage("assistant", "Select at least one product first.");
    return;
  }

  const selectedProductData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful beauty advisor. Build a personalized routine only from the selected products. Use clear sections like Morning, Evening, and Weekly Tips. Mention product names exactly and give practical order of use.",
    },
    {
      role: "user",
      content: `Create a personalized routine using only these selected products:\n${JSON.stringify(
        selectedProductData,
        null,
        2
      )}`,
    },
  ];

  generateRoutineBtn.disabled = true;
  generateRoutineBtn.textContent = "Generating...";

  const routine = await fetchOpenAIResponse(messages);

  generateRoutineBtn.disabled = false;
  generateRoutineBtn.innerHTML =
    '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';

  if (!routine) {
    return;
  }

  routineGenerated = true;
  routineText = routine;

  appendChatMessage("assistant", routineText);

  /* Keep full conversation history so follow-up messages stay contextual */
  conversationMessages = [
    {
      role: "system",
      content:
        "You are a beauty assistant. Only answer about the generated routine or related topics: skincare, haircare, makeup, fragrance, and beauty products. If a user asks something outside these topics, politely redirect them.",
    },
    {
      role: "assistant",
      content: `Generated routine:\n${routineText}`,
    },
  ];
});

/* Follow-up chat handler */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const messageText = userInput.value.trim();
  if (!messageText) {
    return;
  }

  if (!routineGenerated) {
    appendChatMessage(
      "assistant",
      "Generate a routine first, then ask follow-up questions in this chat."
    );
    userInput.value = "";
    return;
  }

  if (!BEAUTY_TOPIC_REGEX.test(messageText)) {
    appendChatMessage(
      "assistant",
      "Please ask about your routine or beauty topics like skincare, haircare, makeup, or fragrance."
    );
    userInput.value = "";
    return;
  }

  appendChatMessage("user", messageText);
  conversationMessages.push({ role: "user", content: messageText });

  const assistantReply = await fetchOpenAIResponse(conversationMessages);
  if (!assistantReply) {
    return;
  }

  appendChatMessage("assistant", assistantReply);
  conversationMessages.push({ role: "assistant", content: assistantReply });

  userInput.value = "";
});

/* Initial setup */
async function initApp() {
  allProducts = await loadProducts();
  loadSelectedProducts();
  renderSelectedProducts();
  appendChatMessage(
    "assistant",
    "Pick products, click Generate Routine, then ask follow-up beauty questions here."
  );
}

initApp();
