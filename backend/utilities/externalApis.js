const axios = require('axios');

// Calls ExchangeRate API
async function convertCurrency(amount, fromCurrency, toCurrency) {
    fromCurrency = fromCurrency.toUpperCase();
    toCurrency = toCurrency.toUpperCase();

    if (fromCurrency === toCurrency) return parseFloat(amount);
    
    try {
        console.log(`[Integration] Fetching live rates from ExchangeRate-API for ${fromCurrency}`);
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
        
        const rate = response.data.rates[toCurrency];
        if (!rate) {
            throw new Error(`Unsupported currency conversion to ${toCurrency}`);
        }

        const converted = parseFloat(amount) * rate;
        return converted.toFixed(2);
    } catch (error) {
        console.error("Error connecting to ExchangeRate API:", error.message);
        throw error; // Let the caller route handle the 500 status
    }
}

// Calls RestCountries API
async function getCountriesAndCurrencies() {
    try {
        console.log(`[Integration] Fetching country-currency mapping from RestCountries`);
        const response = await axios.get('https://restcountries.com/v3.1/all?fields=name,currencies');
        
        // Transform the response slightly so it is easier for Ishika (Frontend) to use
        const formattedList = response.data.map(country => {
            const currencyKeys = Object.keys(country.currencies || {});
            const currencyCode = currencyKeys.length > 0 ? currencyKeys[0] : null;
            const currencyObject = currencyCode ? country.currencies[currencyCode] : null;
            
            return {
                countryName: country.name.common,
                currencyCode: currencyCode,
                currencyName: currencyObject?.name || null,
                currencySymbol: currencyObject?.symbol || null
            };
        }).filter(item => item.currencyCode !== null); // Filter out countries without currencies

        return formattedList;
    } catch (error) {
        console.error("Error connecting to RestCountries API:", error.message);
        throw error;
    }
}

// Placeholder for OCR (Google Vision / Tesseract)
async function performOCR(filePath) {
    try {
        console.log(`[Integration Mock] Sending receipt at "${filePath}" to OCR Module (Heramb's future work).`);
        
        return {
            amount: 150.00,
            date: new Date().toISOString().split('T')[0],
            vendor: "Office Supplies Co",
            rawText: "Sample extracted receipt data..."
        };
    } catch (error) {
        console.error("Error in OCR extraction:", error);
        throw error;
    }
}

module.exports = { convertCurrency, performOCR, getCountriesAndCurrencies };
