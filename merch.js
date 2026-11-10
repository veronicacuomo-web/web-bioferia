const cartStorageKey = "bioferia-cart";
const formatPrice = (amount) => `$${new Intl.NumberFormat("es-AR").format(amount)}`;

const readCart = () => {
    const storedCart = localStorage.getItem(cartStorageKey);
    if (!storedCart) return [];
    const cart = JSON.parse(storedCart);
    if (!Array.isArray(cart) || cart.some((item) =>
        !item || typeof item.key !== "string" || typeof item.name !== "string" ||
        typeof item.image !== "string" || !Number.isFinite(item.price) ||
        !Number.isInteger(item.quantity) || item.quantity < 1
    )) {
        throw new Error("El carrito guardado no tiene un formato válido.");
    }
    return cart;
};

const saveCart = (cart) => {
    localStorage.setItem(cartStorageKey, JSON.stringify(cart));
    updateCartCount(cart);
};

const updateCartCount = (cart) => {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((counter) => {
        counter.textContent = String(count);
        counter.setAttribute("aria-label", `${count} ${count === 1 ? "producto" : "productos"} en el carrito`);
    });
};

const showToast = (message) => {
    const toast = document.querySelector("#cart-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
};

const initializeCarousel = () => {
    const track = document.querySelector("#carousel-track");
    if (!track) return;
    const slides = [...track.querySelectorAll(".carousel-slide")];
    const dots = document.querySelector("#carousel-dots");
    const indexLabel = document.querySelector("#carousel-index");
    let activeIndex = 0;
    let autoplay;

    const goTo = (index) => {
        activeIndex = (index + slides.length) % slides.length;
        track.style.transform = `translateX(-${activeIndex * 100}%)`;
        dots.querySelectorAll("button").forEach((dot, dotIndex) => {
            dot.setAttribute("aria-current", String(dotIndex === activeIndex));
        });
        indexLabel.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    };

    slides.forEach((slide, index) => {
        const dot = document.createElement("button");
        dot.className = "carousel-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Mostrar foto ${index + 1}`);
        dot.setAttribute("aria-current", String(index === 0));
        dot.addEventListener("click", () => goTo(index));
        dots.append(dot);
    });
    document.querySelector(".carousel-prev").addEventListener("click", () => goTo(activeIndex - 1));
    document.querySelector(".carousel-next").addEventListener("click", () => goTo(activeIndex + 1));

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const startAutoplay = () => {
            window.clearInterval(autoplay);
            autoplay = window.setInterval(() => goTo(activeIndex + 1), 6000);
        };
        track.parentElement.addEventListener("mouseenter", () => window.clearInterval(autoplay));
        track.parentElement.addEventListener("mouseleave", startAutoplay);
        track.parentElement.addEventListener("focusin", () => window.clearInterval(autoplay));
        track.parentElement.addEventListener("focusout", startAutoplay);
        startAutoplay();
    }
};

const productGalleryStates = new WeakMap();

const initializeProductDetail = () => {
    const panel = document.querySelector("#product-detail");
    if (!panel) return null;
    const detailImage = panel.querySelector(".product-detail-image");
    const thumbnails = panel.querySelector(".product-detail-thumbnails");
    const options = panel.querySelector(".product-detail-options");
    let activeCard = null;

    const restoreTrigger = () => {
        if (!activeCard) return;
        const trigger = activeCard.querySelector(".photo-expand-trigger");
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
        activeCard = null;
    };

    const close = () => {
        if (!panel.open) return;
        const trigger = activeCard?.querySelector(".photo-expand-trigger");
        trigger?.setAttribute("aria-expanded", "false");
        panel.close();
        activeCard = null;
        window.requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
    };

    const setImage = (index) => {
        const state = productGalleryStates.get(activeCard.querySelector("[data-gallery]"));
        state.goTo(index);
        const selectedImage = state.images[state.activeIndex];
        detailImage.src = selectedImage.src.replace(/w=\d+/, "w=1600");
        detailImage.alt = selectedImage.alt;
        thumbnails.querySelectorAll("button").forEach((button, thumbnailIndex) => {
            button.setAttribute("aria-pressed", String(thumbnailIndex === state.activeIndex));
        });
    };

    const showColor = (state, color) => {
        const imageIndex = state.images.findIndex((image) => image.alt.toLowerCase().includes(color.toLowerCase()));
        if (imageIndex >= 0) setImage(imageIndex);
    };

    const open = (card) => {
        if (activeCard === card && panel.open) {
            close();
            return;
        }
        if (activeCard) activeCard.querySelector(".photo-expand-trigger").setAttribute("aria-expanded", "false");
        activeCard = card;
        const state = productGalleryStates.get(card.querySelector("[data-gallery]"));
        panel.querySelector("#product-detail-category").textContent = card.querySelector(".product-category").textContent;
        panel.querySelector("#product-detail-title").textContent = card.dataset.productName;
        panel.querySelector("#product-detail-price").textContent = formatPrice(Number(card.dataset.productPrice));
        panel.querySelector("#product-detail-description").textContent = card.dataset.detail;
        thumbnails.replaceChildren();

        state.images.forEach((image, index) => {
            const thumbnail = document.createElement("button");
            thumbnail.className = "product-detail-thumbnail";
            thumbnail.type = "button";
            thumbnail.setAttribute("aria-label", `Ver foto ${index + 1} de ${card.dataset.productName}`);
            thumbnail.setAttribute("aria-pressed", String(index === state.activeIndex));
            const thumbnailImage = document.createElement("img");
            thumbnailImage.src = image.src;
            thumbnailImage.alt = "";
            thumbnail.append(thumbnailImage);
            thumbnail.addEventListener("click", () => setImage(index));
            thumbnails.append(thumbnail);
        });

        options.replaceChildren();
        card.querySelectorAll(".product-option").forEach((productOption) => {
            const label = document.createElement("label");
            label.className = "product-detail-option-label";
            label.textContent = productOption.getAttribute("aria-label")?.replace(/^Elegir /, "Elegí ") || "Elegí opción";
            const select = productOption.cloneNode(true);
            select.removeAttribute("id");
            select.addEventListener("change", () => {
                productOption.value = select.value;
                if (productOption.getAttribute("aria-label")?.includes("Color")) showColor(state, select.value);
            });
            label.append(select);
            options.append(label);
            select.value = productOption.value;
            if (productOption.getAttribute("aria-label")?.includes("Color")) showColor(state, select.value);
        });

        card.querySelector(".photo-expand-trigger").setAttribute("aria-expanded", "true");
        panel.showModal();
        setImage(state.activeIndex);
    };

    panel.querySelector(".product-detail-close").addEventListener("click", close);
    panel.addEventListener("close", restoreTrigger);
    panel.addEventListener("click", (event) => {
        if (event.target === panel) close();
    });
    panel.querySelector(".product-detail-add").addEventListener("click", () => {
        if (activeCard) activeCard.querySelector(".product-info .add-to-cart").click();
    });
    return { open, close };
};

const initializeGalleries = (detail) => {
    document.querySelectorAll("[data-gallery]").forEach((gallery) => {
        const card = gallery.closest(".product-card");
        const image = gallery.querySelector(".product-image");
        const count = gallery.querySelector(".gallery-count");
        const imageList = card.querySelector(".product-images");
        const images = imageList
            ? JSON.parse(imageList.textContent.replaceAll("&amp;", "&"))
            : [{ src: image.src, alt: image.alt }];
        let activeIndex = 0;

        const goTo = (index) => {
            activeIndex = (index + images.length) % images.length;
            image.src = images[activeIndex].src;
            image.alt = images[activeIndex].alt;
            if (count) count.textContent = `${activeIndex + 1} / ${images.length}`;
        };
        productGalleryStates.set(gallery, {
            images,
            get activeIndex() { return activeIndex; },
            goTo
        });

        if (images.length < 2) {
            gallery.querySelectorAll(".gallery-arrow, .gallery-count").forEach((control) => control.remove());
        } else {
            gallery.querySelector(".gallery-prev").addEventListener("click", () => goTo(activeIndex - 1));
            gallery.querySelector(".gallery-next").addEventListener("click", () => goTo(activeIndex + 1));
        }
        gallery.querySelector(".photo-expand-trigger").addEventListener("click", () => detail.open(card));
    });
};

const initializeShopFilters = () => {
    const buttons = [...document.querySelectorAll("[data-shop-filter]")];
    const cards = [...document.querySelectorAll(".product-card")];
    const resultCount = document.querySelector("#shop-result-count");
    if (!buttons.length || !cards.length || !resultCount) return;

    buttons.forEach((button) => {
        button.addEventListener("click", () => {
            const category = button.dataset.shopFilter;
            let visibleCount = 0;
            cards.forEach((card) => {
                const isVisible = category === "todos" || card.dataset.category === category;
                card.hidden = !isVisible;
                if (isVisible) visibleCount += 1;
            });
            buttons.forEach((filter) => filter.setAttribute("aria-pressed", String(filter === button)));
            resultCount.textContent = `${visibleCount} ${visibleCount === 1 ? "producto" : "productos"}`;
            const detail = document.querySelector("#product-detail");
            if (detail?.open && detail.querySelector("#product-detail-title").textContent !== "") {
                const activeCard = [...cards].find((card) =>
                    card.dataset.productName === detail.querySelector("#product-detail-title").textContent
                );
                if (activeCard && activeCard.hidden) detail.close();
            }
        });
    });
};

const initializeProducts = () => {
    const cards = document.querySelectorAll(".product-card");
    if (!cards.length) return;
    try {
        updateCartCount(readCart());
    } catch (error) {
        showToast("No pudimos leer el carrito guardado. Revisá la configuración de almacenamiento del navegador.");
        console.error(error);
    }
    const detail = initializeProductDetail();
    initializeGalleries(detail);
    initializeShopFilters();
    document.querySelectorAll(".product-card .product-info .add-to-cart").forEach((button) => {
        button.addEventListener("click", () => {
            const card = button.closest(".product-card");
            const selectedOptions = [...card.querySelectorAll(".product-option")].map((option) => ({
                label: option.getAttribute("aria-label")?.replace(/^Elegir /, "") || "Opción",
                value: option.value
            }));
            const variant = selectedOptions.map((option) => `${option.label} ${option.value}`).join(" · ");
            const key = `${card.dataset.productId}:${selectedOptions.map((option) => option.value).join(":")}`;
            const image = card.querySelector(".product-image");
            try {
                const cart = readCart();
                const existing = cart.find((item) => item.key === key);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    cart.push({
                        key,
                        id: card.dataset.productId,
                        name: card.dataset.productName,
                        price: Number(card.dataset.productPrice),
                        quantity: 1,
                        image: image.src,
                        alt: image.alt,
                        variant
                    });
                }
                saveCart(cart);
                showToast(`${card.dataset.productName} se agregó al carrito.`);
            } catch (error) {
                showToast("No pudimos guardar el producto. Revisá la configuración de almacenamiento del navegador.");
                console.error(error);
            }
        });
    });
};

const initializeCart = () => {
    const itemsContainer = document.querySelector("#cart-items");
    if (!itemsContainer) return;
    const subtotalLabel = document.querySelector("#cart-subtotal");
    const totalLabel = document.querySelector("#cart-total");
    const checkoutButton = document.querySelector("#checkout-button");
    const summary = document.querySelector("#cart-summary");

    const makeCartItemElement = (item) => {
        const article = document.createElement("article");
        article.className = "cart-item";
        article.dataset.cartKey = encodeURIComponent(item.key);

        const image = document.createElement("img");
        image.src = item.image;
        image.alt = typeof item.alt === "string" ? item.alt : item.name;
        article.append(image);

        const details = document.createElement("div");
        const name = document.createElement("h2");
        name.textContent = item.name;
        const description = document.createElement("p");
        const variant = item.variant
            ? item.variant.startsWith("Talle ") || item.variant.startsWith("Color ")
                ? item.variant
                : `Talle ${item.variant}`
            : "";
        description.textContent = `${variant ? `${variant} · ` : ""}${formatPrice(item.price)}`;
        const controls = document.createElement("div");
        controls.className = "cart-item-controls";
        const quantity = document.createElement("div");
        quantity.className = "quantity-control";
        quantity.setAttribute("aria-label", "Cantidad");

        const decrease = document.createElement("button");
        decrease.type = "button";
        decrease.dataset.quantity = "-1";
        decrease.setAttribute("aria-label", "Quitar una unidad");
        decrease.textContent = "−";
        const quantityLabel = document.createElement("span");
        quantityLabel.textContent = String(item.quantity);
        const increase = document.createElement("button");
        increase.type = "button";
        increase.dataset.quantity = "1";
        increase.setAttribute("aria-label", "Agregar una unidad");
        increase.textContent = "+";
        quantity.append(decrease, quantityLabel, increase);

        const remove = document.createElement("button");
        remove.className = "remove-item";
        remove.type = "button";
        remove.textContent = "Quitar";
        controls.append(quantity, remove);
        details.append(name, description, controls);

        const price = document.createElement("span");
        price.className = "cart-item-price";
        price.textContent = formatPrice(item.price * item.quantity);
        article.append(details, price);
        return article;
    };

    const render = () => {
        const cart = readCart();
        updateCartCount(cart);
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        subtotalLabel.textContent = formatPrice(total);
        totalLabel.textContent = formatPrice(total);
        checkoutButton.disabled = cart.length === 0;
        summary.hidden = cart.length === 0;

        if (cart.length === 0) {
            itemsContainer.innerHTML = '<div class="cart-empty"><p>Tu carrito está vacío, regresa a la tienda.</p><a href="merch.html#tienda">Explorar la tienda</a></div>';
            return;
        }

        itemsContainer.replaceChildren(...cart.map(makeCartItemElement));
    };

    try {
        render();
    } catch (error) {
        itemsContainer.textContent = "No pudimos cargar el carrito guardado. Revisá la configuración de almacenamiento del navegador.";
        checkoutButton.disabled = true;
        console.error(error);
    }

    itemsContainer.addEventListener("click", (event) => {
        const itemElement = event.target.closest(".cart-item");
        if (!itemElement) return;
        const key = decodeURIComponent(itemElement.dataset.cartKey);
        try {
            const cart = readCart();
            const item = cart.find((entry) => entry.key === key);
            if (!item) return;
            const quantityChange = event.target.closest("[data-quantity]");
            if (quantityChange) {
                item.quantity += Number(quantityChange.dataset.quantity);
                if (item.quantity <= 0) cart.splice(cart.indexOf(item), 1);
            } else if (event.target.closest(".remove-item")) {
                cart.splice(cart.indexOf(item), 1);
            } else {
                return;
            }
            saveCart(cart);
            render();
        } catch (error) {
            showToast("No pudimos actualizar el carrito.");
            console.error(error);
        }
    });

    checkoutButton.addEventListener("click", () => {
        try {
            const cart = readCart();
            if (cart.length === 0) return;
            const order = cart.map((item) => {
                const variant = item.variant
                    ? item.variant.startsWith("Talle ") || item.variant.startsWith("Color ")
                        ? item.variant
                        : `Talle ${item.variant}`
                    : "";
                return `• ${item.name}${variant ? ` (${variant})` : ""} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`;
            }).join("\n");
            const subject = encodeURIComponent("Pedido de merch Bioferia");
            const body = encodeURIComponent(`Hola, quiero hacer este pedido:\n\n${order}\n\nTotal: ${formatPrice(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}\n\nMis datos para coordinar el pago y la entrega:\n`);
            window.location.href = `mailto:hola@bioferia.com.ar?subject=${subject}&body=${body}`;
        } catch (error) {
            showToast("No pudimos preparar el pedido. Revisá el carrito e intentá nuevamente.");
            console.error(error);
        }
    });
};

initializeCarousel();
initializeProducts();
initializeCart();
