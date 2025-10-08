
console.log("pfm search.js loaded   ");

function searchItem() {
    if (!checkAuth()) return;

    const name = document.getElementById("searchInput").value.trim();
    if (!name) {
        alert("Please enter something to search");
        return;
    }

    fetch(`${BASE_URL}/customer/search-item?name=${encodeURIComponent(name)}`)
        .then(res => res.json())
        .then(data => {
            console.log("Search Result:", data);
            const resultContainer = document.getElementById("result");

            // Clear previous results
            resultContainer.innerHTML = "";

            // Set white background and scrollable container
            resultContainer.style.cssText = `
                max-height: 400px;
                overflow-y: auto;
                background: #EFE8D9;
                border-radius: 8px;
                padding: 10px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            `;

            if (data.success && data.data && data.data.length > 0) {
                data.data.forEach(item => {
                    const div = document.createElement("div");
                    div.className = "search-item-card";
                    div.style.cssText = `
                        display: flex; 
                        align-items: center; 
                        padding: 10px; 
                        margin-bottom: 8px; 
                        border-radius: 6px; 
                        background: #f9f9f9; 
                        transition: transform 0.2s, background 0.2s;
                        cursor: pointer;
                    `;

                    div.onmouseover = () => {
                        div.style.background = "#f1f1f1";
                        div.style.transform = "translateY(-2px)";
                    };
                    div.onmouseout = () => {
                        div.style.background = "#f9f9f9";
                        div.style.transform = "translateY(0)";
                    };

                    // ✅ Redirect only if item.id exists
                    div.onclick = () => {
                        if (!item.id) {
                            console.warn("Item ID is missing, skipping redirect.");
                            // alert("Item details are unavailable right now.");==========
                            window.location.href = `shop.html`;
                            return;
                        }
                        window.location.href = `shop-details.html?id=${item.id}`;
                    };

                    div.innerHTML = `
                        <img src="${item.img || 'assets/img/placeholder.png'}" alt="${item.name}" 
                             style="width: 50px; height: 50px; object-fit: cover; margin-right: 12px; border-radius: 4px; border: 1px solid #ddd;">
                        <div style="flex: 1;">
                            <h5 style="margin: 0; color: #333; font-weight: 600;">
                                ${item.name}
                            </h5>
                            <p style="margin: 4px 0 0 0; color: #555; font-size: 14px;">
                                Price: ₹${(item.discountPrice || item.price).toFixed(2)}
                            </p>
                        </div>
                    `;

                    resultContainer.appendChild(div);
                });
            } else {
                resultContainer.innerHTML = `
                    <p style="color: #333; text-align: center; margin-top: 20px;">
                        No items found.
                    </p>
                `;
            }
        })
        .catch(err => console.error("Error searching items:", err));
}

// Attach event listener to the search form
document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', function (e) {
            e.preventDefault();
            searchItem();
        });
    }
});
