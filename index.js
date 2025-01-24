const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

// CORS Configuration
const corsOptions = {
    origin: "https://www.realvaluetrack.com", // Replace with your frontend's URL rimettere https dopo anche nel originale
    optionsSuccessStatus: 200, // For some legacy browsers
};
app.use(cors(corsOptions));

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// DCF Calculation Function
const calculateDCF = (freeCashFlow, growthRate, discountRate, years = 5, terminalGrowth = 0.03) => {
    let intrinsicValue = 0;
    let currentFCF = freeCashFlow;

    for (let t = 1; t <= years; t++) {
        intrinsicValue += currentFCF / Math.pow(1 + discountRate, t);
        currentFCF *= (1 + growthRate);
    }

    const terminalValue = currentFCF / (discountRate - terminalGrowth);
    intrinsicValue += terminalValue / Math.pow(1 + discountRate, years);

    return intrinsicValue;
};

// API Route to calculate DCF per share
app.get("/api/dcf/:ticker", async (req, res) => {
    const ticker = req.params.ticker;

    try {
        // Fetch free cash flow data
        const cashFlowResponse = await axios.get(
            `https://www.alphavantage.co/query?function=CASH_FLOW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        const cashFlowData = cashFlowResponse.data;

        // Validate cash flow data
        if (!cashFlowData.annualReports || cashFlowData.annualReports.length === 0) {
            return res.status(404).json({
                error: `No free cash flow data available for ${ticker}. This could be due to API limitations or a lack of data for the given ticker.`,
            });
        }

        const freeCashFlow = parseFloat(cashFlowData.annualReports[0].operatingCashflow);

        // Fetch metadata (including shares outstanding and market cap)
        const overviewResponse = await axios.get(
            `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`
        );
        const overviewData = overviewResponse.data;

        // Validate overview data
        if (!overviewData.SharesOutstanding || !overviewData.MarketCapitalization) {
            return res.status(404).json({
                error: `No sufficient data available for ${ticker}.`,
            });
        }

        const sharesOutstanding = parseFloat(overviewData.SharesOutstanding);
        const stockPrice = parseFloat(overviewData.MarketCapitalization) / sharesOutstanding;

        // Calculate intrinsic value
        const growthRate = 0.05; // Example growth rate
        const discountRate = 0.1; // Example discount rate
        const totalDCF = calculateDCF(freeCashFlow, growthRate, discountRate);
        const dcfPerShare = totalDCF / sharesOutstanding;

        res.json({
            ticker,
            dcfPerShare: dcfPerShare.toFixed(2),
            stockPrice: stockPrice.toFixed(2),
            status: dcfPerShare > stockPrice ? "undervalued" : "overvalued",
            upside: ((dcfPerShare / stockPrice - 1) * 100).toFixed(2),
        });
    } catch (error) {
        console.error("Error fetching data:", error.response?.data || error.message);
        res.status(500).json({ error: "An error occurred while fetching data. Please try again later." });
    }
});


app.listen(3000, () => console.log("Server running on http://localhost:3000"));
