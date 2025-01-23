async function getStockData() {
    const ticker = document.getElementById("ticker").value.trim(); // Get the ticker from the input
    const resultElement = document.getElementById("result");
    const errorMessage = document.getElementById("error-message");

    // Clear previous results
    resultElement.innerHTML = "";
    errorMessage.style.display = "none";

    if (ticker === "") {
        errorMessage.style.display = "block";
        errorMessage.innerHTML = "Please enter a valid ticker.";
        return;
    }

    try {
        const response = await fetch(`https://stock-dcf-app.onrender.com/${ticker}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Update results
        resultElement.innerHTML = `
            <p>DCF Per Share: $${data.dcfPerShare}</p>
            <p>Actual Stock Price: $${data.stockPrice}</p>
            <p>The stock is ${data.status}. (${data.upside}% ${data.status === "undervalued" ? "upside" : "downside"})</p>
        `;
    } catch (error) {
        console.error("Error fetching data:", error.message);
        errorMessage.style.display = "block";
        errorMessage.innerHTML = error.message || "An unexpected error occurred.";
    }
}

document.getElementById("calculate").addEventListener("click", getStockData);
