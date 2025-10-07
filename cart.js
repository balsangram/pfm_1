const BASE_URL = "https://api.priyafreshmeats.com";
// const BASE_URL = "https://api.priyafreshmeats.com";

// ---------------------------
// ✅ Authentication Check
// ---------------------------
function checkAuth() {
    const userId = localStorage.getItem("pfm_userId");
    if (!userId) {
        window.location.href = "signin-page.html";
        return false;
    }
    return true;
}

// ---------------------------
// ✅ Load Cart Count
// ---------------------------
function loadCartCount() {
    const customerId = localStorage.getItem('pfm_userId') || '0';
    const authToken = localStorage.getItem('pfm_authToken') || '';
    const cartCountElement = document.getElementById("cart-count");

    if (cartCountElement) {
        cartCountElement.textContent = '0';
        if (customerId === '0' || !authToken) return;

        fetch(`${BASE_URL}/customer/cart/${customerId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        })
            .then(res => res.json())
            .then(data => {
                const cartItems = data.data || [];
                cartCountElement.textContent = cartItems.reduce((sum, item) => sum + (item.count || 1), 0).toString();
            })
            .catch(err => {
                console.error("Error fetching cart count:", err);
                cartCountElement.textContent = '0';
            });
    }
}

// ---------------------------
// ✅ Load Razorpay Script
// ---------------------------
function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => reject(new Error("Razorpay SDK failed to load"));
        document.body.appendChild(script);
    });
}

// ---------------------------
// ✅ Load Cart Items
// ---------------------------
function loadCart() {
    if (!checkAuth()) return;

    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');
    const cartItemsContainer = document.getElementById("cart-items");
    const cartTotalElement = document.getElementById("cart-total");
    const checkoutBtn = document.getElementById("checkout-btn");

    if (!customerId || !authToken) return;

    fetch(`${BASE_URL}/customer/cart/${customerId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(res => res.json())
        .then(data => {
            const cartItems = data.data || [];
            if (!cartItems.length) {
                cartItemsContainer.innerHTML = "<tr><td colspan='6' class='text-center py-8 text-gray-500'>Your cart is empty. <a href='shop.html' class='text-blue-500 underline'>Continue Shopping</a></td></tr>";
                cartTotalElement.textContent = "₹0.00";
                if (checkoutBtn) checkoutBtn.disabled = true;
                return;
            }

            if (checkoutBtn) checkoutBtn.disabled = false;
            let total = 0;
            cartItemsContainer.innerHTML = '';

            cartItems.forEach(item => {
                const price = item.subCategory?.discountPrice || item.subCategory?.price || 0;
                const count = item.count || 1;
                const itemTotal = price * count;
                total += itemTotal;

                const row = document.createElement("tr");
                row.className = "border-b border-gray-200";
                row.innerHTML = `
                    <td class="p-4 text-center"><img src="${item.subCategory?.img || 'assets/img/product4/placeholder.png'}" alt="${item.subCategory?.name || 'Product'}" class="w-20 h-20 object-cover rounded mx-auto"></td>
                    <td class="p-4 text-center">${item.subCategory?.name || 'No Name'}</td>
                    <td class="p-4 text-center font-semibold">₹${price.toFixed(2)}</td>
                    <td class="p-4 text-center">
                        <div class="cart-plus-minus flex items-center justify-center gap-2">
                            <button class="dec qtybutton w-8 h-8 border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" data-id="${item.subCategory?._id}" data-current="${count}">-</button>
                            <input type="number" value="${count}" min="1" class="w-12 text-center border border-gray-300 rounded" readonly>
                            <button class="inc qtybutton w-8 h-8 border border-gray-300 bg-gray-50 text-gray-700 rounded hover:bg-gray-100 transition-colors" data-id="${item.subCategory?._id}" data-current="${count}">+</button>
                        </div>
                    </td>
                    <td class="p-4 text-center font-semibold">₹${itemTotal.toFixed(2)}</td>
                    <td class="p-4 text-center"><button class="btn btn-danger btn-sm remove-item bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors" data-id="${item.subCategory?._id}"><i class="fas fa-trash"></i></button></td>
                `;
                cartItemsContainer.appendChild(row);
            });

            cartTotalElement.textContent = `₹${total.toFixed(2)}`;
            cartTotalElement.dataset.total = total.toFixed(2);

            attachCartEventListeners();
        })
        .catch(err => {
            console.error("Error loading cart:", err);
            cartItemsContainer.innerHTML = "<tr><td colspan='6' class='text-center py-8 text-red-500'>Failed to load cart. Please try again.</td></tr>";
        });
}

// ---------------------------
// ✅ Cart Event Listeners
// ---------------------------
function attachCartEventListeners() {
    // Quantity buttons
    document.querySelectorAll('.qtybutton').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const productId = this.dataset.id;
            const currentCount = parseInt(this.dataset.current);
            const increment = this.classList.contains('inc');
            updateQuantity(productId, increment, currentCount);
        });
    });

    // Remove buttons
    document.querySelectorAll('.remove-item').forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            if (confirm('Are you sure you want to remove this item?')) {
                removeItem(this.dataset.id);
            }
        });
    });

    // Checkout button
    const checkoutBtn = document.getElementById("checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            initiateCheckout();
        });
    }
}

// ---------------------------
// ✅ Update Quantity
// ---------------------------
function updateQuantity(productId, increment, currentCount) {
    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');
    const newCount = increment ? currentCount + 1 : Math.max(1, currentCount - 1);

    fetch(`${BASE_URL}/customer/cart/${customerId}/item/${productId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: newCount })
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to update');
            loadCart();
        })
        .catch(err => {
            console.error("Error updating quantity:", err);
            alert("Failed to update quantity. Please try again.");
        });
}

// ---------------------------
// ✅ Remove Item
// ---------------------------
function removeItem(productId) {
    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');

    fetch(`${BASE_URL}/customer/cart/${customerId}/item/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    })
        .then(res => {
            if (!res.ok) throw new Error('Failed to remove');
            loadCart();
        })
        .catch(err => {
            console.error("Error removing item:", err);
            alert("Failed to remove item. Please try again.");
        });
}

// ---------------------------
// ✅ Create Order (called only after successful payment or zero amount)
// ---------------------------
// async function createOrder(orderData) {
//     const customerId = localStorage.getItem('pfm_userId');
//     const authToken = localStorage.getItem('pfm_authToken');

//     const response = await fetch(`${BASE_URL}/customer/create-order/${customerId}`, {
//         method: 'POST',
//         headers: {
//             'Authorization': `Bearer ${authToken}`,
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(orderData)
//     });

//     if (!response.ok) {
//         throw new Error('Failed to create order');
//     }

//     return await response.json();
// }

async function createOrder(orderData) {

    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');

    const response = await fetch(`${BASE_URL}/customer/create-order/${customerId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });

    if (!response.ok) {
        throw new Error('Failed to create order');
    }

    const result = await response.json();
    console.log("🚀 ~ createOrder ~ result+++++++++++++++++++++++:", result.data)
    localStorage.setItem('pfm_orderId', result.data.order);
    const pfm_orderId = localStorage.getItem('pfm_orderId');
    console.log("🚀 ~ createOrder ~ pfm_orderId 1234567898765434444444444444444444444:", pfm_orderId)
    // ✅ Save orderId locally if available
    if (result.success && result.data?.orderId) {
        console.log("🚀 ~ createOrder ~ result.data.orderId:", result.data.orderId)
        console.log('Order ID saved locally:', result.data.orderId);
    } else {
        console.warn('Order ID not found in response:', result);
    }

    return result;
}


// ---------------------------
// ✅ Initiate Razorpay Payment
// ---------------------------
async function initiateRazorpayPayment(amount, customerId) {
    const authToken = localStorage.getItem('pfm_authToken');

    const response = await fetch(`${BASE_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: amount.toString(),
            id: customerId
        })
    });

    // Fixed: Log after parsing JSON, not raw response
    const initiateData = await response.json();
    console.log("🚀 ~ initiateRazorpayPayment ~ initiateData: ===========================", initiateData);

    if (!response.ok) {
        throw new Error('Failed to initiate payment');
    }

    return initiateData;
}

// ---------------------------
// ✅ Verify Razorpay Payment
// ---------------------------
async function verifyRazorpayPayment(razorpayData) {
    console.log("00000000000000000000000000000000000000000000000");

    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');

    const response = await fetch(`${BASE_URL}/payments/verify`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(razorpayData)
    });

    if (!response.ok) {
        throw new Error('Failed to verify payment');
    }

    return await response.json();
}

// ---------------------------
// ✅ Handle Razorpay Payment
// ---------------------------
async function handlePayment(customerId, amount, orderData) {
    try {
        // console.log("111111111111111111111111111111111111111111111111");

        // Initiate payment on backend
        const initiateData = await initiateRazorpayPayment(amount, customerId);
        const razorpayOrderId = initiateData.razorpay_order_id; // Assuming backend returns this

        await loadRazorpayScript();

        const options = {
            key: 'rzp_test_R9sbSkX4NbwNms', // ⚠️ REPLACE THIS WITH YOUR REAL TEST/LIVE KEY ID FROM RAZORPAY DASHBOARD
            amount: parseInt(amount) * 100, // Amount in paise
            currency: 'INR',
            name: 'Priya Fresh Meats',
            description: 'Order Payment',
            order_id: razorpayOrderId,
            handler: function (response) {
                // Payment successful, verify and then create order
                verifyPayment(response, orderData);
            },
            prefill: {
                name: 'Customer Name', // TODO: Fetch from user profile
                email: 'customer@example.com', // TODO: Fetch from user profile
                contact: document.getElementById('phoneInput').value || ''
            },
            theme: {
                color: '#28a745'
            },
            modal: {
                ondismiss: function () {
                    alert('Payment cancelled');
                }
            }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    } catch (error) {
        console.error('Payment initiation error:', error);
        alert('Payment initialization failed. Please try again.');
    }
}

// ---------------------------
// ✅ Verify Payment (creates order only on success)
// ---------------------------

async function verifyPayment(paymentResponse, orderData) {
    try {
        // const rzp_stored_checkout_id = JSON.parse(localStorage.getItem('rzp_stored_checkout_id'));
        // const rzp_checkout_anon_id = JSON.parse(localStorage.getItem('rzp_checkout_anon_id'));
        // const rzp_device_id = JSON.parse(localStorage.getItem('rzp_device_id'));
        const verifyData = {

            razorpay_payment_id: "pay_RL14wteGrUJHPW",
            razorpay_order_id: "order_RL121o2KMa4GH8",
            razorpay_signature: "fb854d7b97bff0187a5743667a3b10ec165b8df9beced2386ca11368b76bd071"
            // razorpay_payment_id: rzp_stored_checkout_id,
            // razorpay_order_id: rzp_checkout_anon_id,
            // razorpay_signature: rzp_device_id
            // razorpay_payment_id: paymentResponse.rzp_stored_checkout_id,
            // razorpay_order_id: paymentResponse.rzp_checkout_anon_id,
            // razorpay_signature: paymentResponse.rzp_device_id
        };
        console.log("🚀 ~ verifyPayment ~ verifyData:", verifyData);

        const verifyResponse = await verifyRazorpayPayment(verifyData);
        if (verifyResponse.success) {
            // Only create order after payment success
            const orderResponse = await createOrder(orderData);
            if (orderResponse.success) {
                alert('Payment successful! Order placed.');
                clearCartAndRedirect();
            } else {
                alert('Order creation failed after payment. Please contact support.');
            }
        } else {
            alert('Payment verification failed. Please contact support.');
        }
    } catch (error) {
        console.error('Verification error:', error);
        alert('Payment verification failed.');
    }
}

// ---------------------------
// ✅ Clear Cart and Redirect
// ---------------------------
function clearCartAndRedirect() {
    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');

    fetch(`${BASE_URL}/customer/cart/${customerId}/clear`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
    }).then(() => {
        window.location.href = 'ordered_page.html'; // Assume this page exists
    }).catch(err => {
        console.error('Error clearing cart:', err);
        window.location.href = 'ordered_page.html';
    });
}

// ---------------------------
// ✅ Checkout Logic
// ---------------------------
async function initiateCheckout() {
    if (!checkAuth()) return;

    const customerId = localStorage.getItem('pfm_userId');
    const authToken = localStorage.getItem('pfm_authToken');
    const totalAmount = parseFloat(document.getElementById("cart-total")?.dataset.total || '0');

    if (totalAmount <= 0) {
        alert("No items in cart.");
        return;
    }

    // Fetch cart items
    const cartRes = await fetch(`${BASE_URL}/customer/cart/${customerId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const cartData = await cartRes.json();
    const cartItems = cartData.data || [];

    try {
        const walletSection = document.getElementById('walletSection');
        const walletInput = document.getElementById('walletInput');
        const couponSelect = document.getElementById('couponSelect');
        const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));

        // Reset UI fields
        couponSelect.innerHTML = '<option value="">-- Select Coupon --</option>';
        walletInput.value = '';
        walletInput.disabled = true;
        document.getElementById('addressInput').value = '';
        document.getElementById('pincodeInput').value = '';
        document.getElementById('phoneInput').value = '';
        document.getElementById('notesInput').value = '';
        document.getElementById('locationDisplay').textContent = '';

        // ✅ Fetch coupons
        const couponResponse = await fetch(`${BASE_URL}/customer/coupons/${customerId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const couponData = await couponResponse.json();

        if (couponData.success && Array.isArray(couponData.data?.availableCoupons)) {
            couponData.data.availableCoupons.forEach(c => {
                const option = document.createElement('option');
                option.value = c._id;
                option.textContent = `${c.name} (${c.code}) - ${c.discount}% off`;
                couponSelect.appendChild(option);
            });
        }

        // ✅ Fetch wallet points
        const walletResponse = await fetch(`${BASE_URL}/customer/wallet/${customerId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const walletData = await walletResponse.json();
        const maxWalletPoints = walletData.success ? (walletData.data.walletPoints || 0) : 0;
        walletSection.style.display = totalAmount > 500 ? 'block' : 'none';
        walletInput.disabled = false;
        walletInput.placeholder = `Enter wallet points (max ${Math.min(maxWalletPoints, totalAmount)})`;
        walletInput.max = Math.min(maxWalletPoints, totalAmount);

        // 🌍 Location variables
        let latitude = 0;
        let longitude = 0;
        let locationMode = "manual"; // 'gps' or 'pincode'

        // Mutually exclusive logic for wallet & coupon
        walletInput.oninput = () => {
            if (walletInput.value > 0) {
                couponSelect.disabled = true;
                couponSelect.value = '';
            } else {
                couponSelect.disabled = false;
            }
        };
        couponSelect.onchange = () => {
            if (couponSelect.value !== '') {
                walletInput.disabled = true;
                walletInput.value = '';
            } else {
                walletInput.disabled = false;
            }
        };

        // 📍 Use current location
        document.getElementById('useCurrentLocation').onclick = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        latitude = pos.coords.latitude;
                        longitude = pos.coords.longitude;
                        locationMode = "gps";
                        const locText = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
                        document.getElementById('locationDisplay').textContent = `Detected: ${locText}`;
                        const addrInput = document.getElementById('addressInput');
                        addrInput.value = addrInput.value
                            ? `${addrInput.value}, ${locText}`
                            : `${locText} (Auto-detected)`;
                    },
                    err => {
                        if (err.code === 1)
                            alert("Location permission denied. Please enter address manually.");
                        else
                            alert("Unable to get location. Please enter manually.");
                    }
                );
            } else {
                alert("Geolocation not supported by your browser.");
            }
        };

        modal.show();

        // ✅ Confirm checkout
        document.getElementById('confirmCheckoutBtn').onclick = async function (e) {
            e.preventDefault();

            const walletPoints = parseInt(walletInput.value || 0);
            const couponId = couponSelect.value || null;
            const address = document.getElementById('addressInput').value.trim();
            const pincode = document.getElementById('pincodeInput').value.trim();
            const phone = document.getElementById('phoneInput').value.trim();
            const notes = document.getElementById('notesInput').value.trim();

            if (!address || !pincode || !phone) {
                alert("Please fill in address, pincode, and phone number.");
                return;
            }

            if (walletPoints > 0 && (isNaN(walletPoints) || walletPoints > parseFloat(walletInput.max))) {
                alert("Invalid wallet points entered.");
                return;
            }

            // 🧭 If not using GPS, fetch lat/long from pincode
            if (locationMode !== "gps" && pincode) {
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`);
                    const geoData = await geoRes.json();
                    if (geoData.length > 0) {
                        latitude = parseFloat(geoData[0].lat);
                        longitude = parseFloat(geoData[0].lon);
                        console.log("📍 Pincode-based lat/lon:", latitude, longitude);
                    } else {
                        console.warn("No location found for pincode:", pincode);
                    }
                } catch (err) {
                    console.error("Error fetching pincode coordinates:", err);
                }
            }

            modal.hide();

            // 💰 Calculate final amount
            let finalAmount = totalAmount - walletPoints;
            if (couponId) {
                try {
                    const couponRes = await fetch(`${BASE_URL}/customer/coupon/${couponId}`, {
                        headers: { 'Authorization': `Bearer ${authToken}` }
                    });
                    const coupon = await couponRes.json();
                    if (coupon.success && coupon.data?.discount) {
                        finalAmount *= (1 - (coupon.data.discount / 100));
                    }
                } catch (err) {
                    console.error("Error fetching coupon details:", err);
                }
            }
            finalAmount = Math.max(0, Math.round(finalAmount * 100) / 100);

            // 🧾 Prepare order
            const orderData = {
                location: address,
                phone,
                notes,
                latitude,
                longitude,
                pincode: parseInt(pincode),
                finalAmount,
                walletPoint: walletPoints > 0 ? walletPoints : undefined,
                couponsId: couponId || undefined,
                items: cartItems.map(item => ({
                    subCategoryId: item.subCategory._id,
                    count: item.count || 1
                }))
            };

            if (finalAmount === 0) {
                await prepareAndCreateOrder(orderData);
            } else {
                await handlePayment(customerId, finalAmount, orderData);
            }
        };
    } catch (err) {
        console.error("Checkout initialization failed:", err);
        alert("Failed to initiate checkout. Please try again.");
    }
}



// ---------------------------
// ✅ Helper: Prepare and Create Order (for zero amount or post-payment)
// ---------------------------
async function prepareAndCreateOrder(orderData) {
    try {
        const orderResponse = await createOrder(orderData);
        if (orderResponse.success) {
            alert('Order placed successfully!');
            clearCartAndRedirect();
        } else {
            alert("Failed to create order.");
        }
    } catch (err) {
        console.error("Order creation error:", err);
        alert("Order creation failed. Please try again.");
    }
}

// ---------------------------
// ✅ Initial Load
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
    loadCartCount();
    loadCart();
});