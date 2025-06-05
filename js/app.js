import { createApp, ref, reactive, computed, onMounted } from 'vue';

createApp({
    setup() {
        // State
        const products = ref([]);
        const categories = ref([]);
        const siteConfig = reactive({
            title: 'Cargando Menú...',
            headerColor: '#FF6B35', 
            lastUpdated: '', 
            logoUrl: '',
            hideAllCategory: false,
            footerContent: '',
            footerColor: '#1C1C1E', 
            showFooter: false
        });
        const whatsappConfig = reactive({
            number: ''
        });

        const selectedProduct = ref(null);

        // Cart state
        const cart = ref(JSON.parse(localStorage.getItem('cart')) || []);
        const showCart = ref(false);
        const needsChange = ref(false);
        const paymentBill = ref("100");
        const customerInfo = reactive({
            name: '',
            address: ''
        });
        const cartView = ref('items');

        // Category filtering state
        const selectedCategoryId = ref(null);

        // Load configuration from URL
        const loadConfigFromUrl = async () => {
            const remoteJsonUrl = 'https://raw.githubusercontent.com/IsmaelLima21/Shop/f3c4bfb602180291df64fc74cfb83fc60f02f378/data/menu-digital-backup-2025-06-05.json';
 

            if (!remoteJsonUrl) {
                console.warn('No remote JSON URL found in localStorage.');
                siteConfig.title = 'Configuración no cargada';
                siteConfig.footerContent = 'Por favor, configura la URL del menú en el almacenamiento local (e.g., via Developer Console).';
                siteConfig.showFooter = true;
                return; 
            }

            try {
                const response = await fetch(remoteJsonUrl);
                if (!response.ok) {
                    throw new Error(`Error al cargar: ${response.status}`);
                }

                const loadedData = await response.json();

                products.value = Array.isArray(loadedData.products) ? loadedData.products : [];
                categories.value = Array.isArray(loadedData.categories) ? loadedData.categories : [];

                siteConfig.title = loadedData.siteConfig?.title || 'Menú Digital';
                siteConfig.headerColor = loadedData.siteConfig?.headerColor || '#FF6B35';
                siteConfig.logoUrl = loadedData.siteConfig?.logoUrl || '';
                siteConfig.hideAllCategory = loadedData.siteConfig?.hideAllCategory === true; 
                siteConfig.footerContent = loadedData.siteConfig?.footerContent || ' 2023 Menú Digital. Todos los derechos reservados.';
                siteConfig.footerColor = loadedData.siteConfig?.footerColor || '#1C1C1E';
                siteConfig.showFooter = loadedData.siteConfig?.showFooter !== false; 

                whatsappConfig.number = loadedData.whatsappConfig?.number || '';

                console.log('Menu data loaded successfully from URL.');

            } catch (error) {
                console.error('Error loading menu configuration from URL:', error);
                siteConfig.title = 'Error al Cargar Menú';
                siteConfig.footerContent = `No se pudo cargar el menú desde la URL configurada. ${error.message}`;
                siteConfig.showFooter = true;
                products.value = []; 
                categories.value = []; 
            }
        };

        // Load data on app mount
        onMounted(loadConfigFromUrl);

        // Computed properties for cart
        const cartItemCount = computed(() => {
            return cart.value.reduce((total, item) => total + item.quantity, 0);
        });

        const cartTotal = computed(() => {
            return cart.value.reduce((total, item) => total + (item.price * item.quantity), 0);
        });

        // Products filtering for client view
        const visibleProducts = computed(() => {
            if (!Array.isArray(products.value)) {
                 return [];
            }
            const filteredByCategory = selectedCategoryId.value
                ? products.value.filter(product => product.categoryId === selectedCategoryId.value)
                : products.value;

            return filteredByCategory.filter(product => product.visible !== false); 
        });

        // Visible categories
        const visibleCategories = computed(() => {
             if (!Array.isArray(categories.value)) {
                 return [];
             }
            return categories.value.filter(category => category.visible !== false); 
        });


        // Cart methods
        const toggleCart = () => {
            showCart.value = !showCart.value;
             if (!showCart.value) {
                cartView.value = 'items';
                customerInfo.name = '';
                customerInfo.address = '';
                needsChange.value = false;
                paymentBill.value = "100";
            }
        };

        const addToCart = (product) => {
            const existingItem = cart.value.find(item => item.productId === product.id);

            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.value.push({
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: 1
                });
            }

            saveCart();
        };

        const increaseQuantity = (item) => {
            item.quantity += 1;
            saveCart();
        };

        const decreaseQuantity = (item) => {
            if (item.quantity > 1) {
                item.quantity -= 1;
                saveCart();
            } else {
                removeFromCart(item);
            }
        };

        const removeFromCart = (item) => {
            const index = cart.value.findIndex(i => i.productId === item.productId);
            if (index !== -1) {
                cart.value.splice(index, 1);
                saveCart();
            }
        };

        const saveCart = () => {
            localStorage.setItem('cart', JSON.stringify(cart.value));
        };

        const showProductDetails = (product) => {
            selectedProduct.value = product;
        };

        const closeDetails = () => {
            selectedProduct.value = null;
        };

        // Category methods
        const selectCategory = (categoryId) => {
            if (selectedCategoryId.value === categoryId) {
                selectedCategoryId.value = null; 
            } else {
                selectedCategoryId.value = categoryId;
            }
        };

        // WhatsApp methods
        const sendOrderToWhatsApp = () => {
            const phoneNumber = whatsappConfig.number; 

            if (!phoneNumber) {
                alert('No se ha configurado un número de WhatsApp para enviar pedidos.');
                return;
            }

             if (!customerInfo.name || !customerInfo.address) {
                alert('Por favor completa tu nombre y dirección de entrega antes de enviar el pedido.');
                return;
            }

            if (cart.value.length === 0) {
                 alert('El carrito está vacío.');
                 return;
            }

            let message = " *NUEVO PEDIDO* \n\n";
            message += `*Cliente:* ${customerInfo.name}\n`;
            message += `*Dirección:* ${customerInfo.address}\n\n`;
            message += "*Productos:*\n";

            cart.value.forEach(item => {
                message += `• ${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}\n`;
            });

            message += `\n*Total: $${cartTotal.value.toFixed(2)}*`;

            if (needsChange.value) {
                const billAmount = parseFloat(paymentBill.value);
                 if (!isNaN(billAmount) && billAmount >= cartTotal.value) {
                    message += `\n\n*Necesito cambio*`;
                    message += `\nPagaré con: $${billAmount.toFixed(2)}`;
                    const changeAmount = billAmount - cartTotal.value;
                    message += `\nCambio a recibir: $${changeAmount.toFixed(2)}`;
                 } else {
                     message += `\n\n*Pagaré con:* $${paymentBill.value} (Billete no válido para cambio)`;
                 }
            }

            const encodedMessage = encodeURIComponent(message);

            window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
        };

        const showCustomerDetails = () => {
            cartView.value = 'details';
        };

        const showCartItems = () => {
            cartView.value = 'items';
        };

        return {
            products,
            categories,
            siteConfig,
            whatsappConfig,
            selectedProduct,
            cart,
            showCart,
            needsChange,
            paymentBill,
            customerInfo,
            cartView,
            selectedCategoryId,
            cartItemCount,
            cartTotal,
            visibleProducts,
            visibleCategories,
            toggleCart,
            addToCart,
            increaseQuantity,
            decreaseQuantity,
            removeFromCart,
            showProductDetails,
            closeDetails,
            selectCategory,
            sendOrderToWhatsApp,
            showCustomerDetails,
            showCartItems,
            loadConfigFromUrl 
        };
    }
}).mount('#app');