// Version 0.2
// Author: Martin Knoche

const USDorEUR = "EUR"  // Your preferred currency to show values EUR or USD

// Use Fake Data for Preview or use data from widgetParameter input
let widgetInput
if (config.runsInApp) {
    widgetInput = '[ {"Currency":"BTC", "Amount":"0.4990601", "Invest":"600"},' +
        '{"Currency":"ETH", "Amount":"0.45801971", "Invest":"275"},' +
        '{"Currency":"DOT", "Amount":"788.95390707", "Invest":"20000"},' +
        '{"Currency":"ADA", "Amount": "137.954223", "Invest":"100"},' +
        '{"Currency":"YFI", "Amount": "0.2251496", "Invest":"100"},' +
        '{"Currency":"XRP", "Amount": "447.7493", "Invest":"305.44"},' +
        '{"Currency":"ZRX", "Amount": "2480.11194", "Invest":"4000"},' +
        '{"Currency":"BNT", "Amount": "14.97", "Invest":"25"},' +
        '{"Currency":"MDCL", "Amount": "425", "Invest":"50"},' +
        '{"Currency":"LSK", "Amount": "159.99545634", "Invest":"300"},' +
        '{"Currency":"TKN", "Amount": "27.11", "Invest":"15"},' +
        '{"Currency":"AMPL", "Amount": "251.70", "Invest":"250"},' +
        '{"Currency":"INT", "Amount": "5490.59", "Invest":"100"},' +
        '{"Currency":"SPK", "Amount": "66.88", "Invest":"33.44"},' +
        '{"Currency":"FUN", "Amount": "382.5515", "Invest":"40.44"},' +
        '{"Currency":"MIOTA", "Amount": "3.21", "Invest":"10"}]';
} else {
    widgetInput = args.widgetParameter;}

const ENV = {// Define colors and other parameters:
    "colors": {
        "bg": Color.dynamic(new Color('#FFFFFF'), new Color('#111111')),
        "normal": Color.dynamic(new Color('#111111'), new Color('#FFFFFF')),
        "red": Color.dynamic(new Color('#FF0000'), new Color('#FF0000')),
        "green": Color.dynamic(new Color('#00FF00'), new Color('#00FF00')),
        "blue": Color.dynamic(new Color('#0000FF'), new Color('#0000FF')),
        "gray": Color.gray(),
        "gold": new Color('#D4AF37')
    },
    "list_len": 13, // NUMBER OF ELEMENTS SHOWN IN THE LIST IN LARGE WIDGET
    "text_size": 11, // ADJUST TEXT SIZE IF ELEMENTS ARE NOT SHOWING PROPERLY IN LARGE WIDGET
    "spacing": 5, // SPACING BETWEEN LIST ITEMS IN LARGE WIDGET
    "headerspacing": 3, // SPACING BETWEEN HEADER AND LIST IN LARGE WIDGET
    "num_rows": 4, // HOW MANY COINS SHOULD BE DISPLAYED VERTICALLY IN MEDIUM WIDGET
    "preview": "small" // PREVIEW OF WIDGET IN APP (SMALL, MEDIUM or LARGE)
}

// Check if input is correct
if (widgetInput != null) {
    var depot = JSON.parse(widgetInput)
} else {
    throw new Error("No Widget parameter set. Expected format: JSON {'Currency':NAMECODE, 'Amount':AMOUNTOFCOIN, 'Invest':INVESTEDMONEY}")
}

// Function to generate apiURL for specific coin
let apiURL = (coins, USDorEUR) => `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${coins.toString(",")}&tsyms=${USDorEUR}`;
// Function to make the request from CoinMarketCap
async function requestPrice(coins) {
    return await new Request(apiURL(coins, USDorEUR)).loadJSON()
}

// Make Array of coin names
let coins = Array()
depot.forEach(function(val, index) {coins[index] = val.Currency})

// Request data for all coins from CryptoCompare
let data = await requestPrice(coins)
data = data.RAW

// Add depot amounts and invests to data and create array from API Request
dataarray = []
depot.map(function(elem) {
    data[elem.Currency][USDorEUR]['CURRENCY'] = elem.Currency;
    data[elem.Currency][USDorEUR]['AMOUNT'] = elem.Amount;
    data[elem.Currency][USDorEUR]['INVEST'] = elem.Invest;
    dataarray.push(data[elem.Currency][USDorEUR])})

// TypeCasting to float and calculate additional metrics
dataarray.map(function(elem) {elem['PRICE'] = parseFloat(elem['PRICE'])})
dataarray.map(function(elem) {elem['INVEST'] = parseFloat(elem['INVEST'])})
dataarray.map(function(elem) {elem['CHANGEPCT24HOUR'] = parseFloat(elem['CHANGEPCT24HOUR'])})
dataarray.map(function(elem) {elem['AMOUNT'] = parseFloat(elem['AMOUNT'])})
dataarray.map(function(elem) {elem['VALUE'] = elem['AMOUNT'] * elem['PRICE']})
dataarray.map(function(elem) {elem['PROFIT'] = elem['VALUE'] - elem['INVEST']})
dataarray.map(function(elem) {elem['PROFITPCT'] = (elem['PROFIT'] / elem['INVEST']) * 100})
dataarray.map(function(elem) {elem['VALUECHANGE24HOUR'] = (elem['CHANGEPCT24HOUR'] / 100) * elem['VALUE']})

// Aggregate Sums
let total = {}
total['invest'] = dataarray.reduce((prev, next) => prev + next['INVEST'], 0)
total['value'] = dataarray.reduce((prev, next) => prev + next['VALUE'], 0)
total['profit'] = dataarray.reduce((prev, next) => prev + next['PROFIT'], 0)
total['pctprofit'] = total['profit'] / total['invest']
total['c24h'] = dataarray.reduce((prev, next) => prev + next['VALUECHANGE24HOUR'], 0)
total['pct24h'] = total['c24h'] / total['value']

function sort_filter(data, sort) {
    // Sort coins according to PROFITPCT
    dataarray.sort(function(a,b) {return b[sort]-a[sort]})

    // Delete EUR in data (EUR is used to involve lost money with dead coins for example)
    return dataarray.filter(function(value, _, __){return value['CURRENCY'] !== "EUR"})
}


// Create the Widget
if (config.runsInApp) {config.widgetFamily = ENV.preview}
let widget = await createWidget(dataarray, total)

// Create the Widget
if (!config.runsInWidget) {
    // Show Widget Preview
    switch (ENV.preview) {
        case "small": await widget.presentSmall(); break
        case "medium": await widget.presentMedium(); break
        case "large": await widget.presentLarge(); break
    }
} else {
    // Tell the system to show the widget.
    Script.setWidget(widget)
    Script.complete()
}

function text(stack, content, size, color) {
    let txt = stack.addText(content)
    txt.textColor = ENV.colors[color]
    txt.font = Font.boldSystemFont(size)
}

function image(stack, content, size, color) {
    let img = stack.addImage(SFSymbol.named(content).image)
    img.tintColor = ENV.colors[color]
    img.imageSize = new Size(size, size)
}


// Function to build and format the Widget itself
async function createWidget(data, total) {
    // Define currency and percentage format
    const Num = new Intl.NumberFormat('de-DE',{ style: 'currency', currency: USDorEUR, minimumFractionDigits: 2 })
    const NumD = new Intl.NumberFormat('de-DE',{ style: 'currency', currency: USDorEUR, minimumFractionDigits: 0})
    Intl.NumberFormat.prototype.formatWithSign = function(x)
    {
        let y = this.format(x);
        return x < 0 ? y : '+' + y;
    }

    const Per = new Intl.NumberFormat('de-DE',{ style: 'percent', minimumFractionDigits: 1 })
    const PerD = new Intl.NumberFormat('de-DE',{ style: 'percent', minimumFractionDigits: 0 })
    const list = new ListWidget()

    // cache data for at least 10min
    list.refreshAfterDate = new Date(Date.now() + 1800000);

    // Get refresh date
    let date = new Date(Date.now());

    list.setPadding(8,8,8,8);
    list.backgroundColor = ENV.colors.bg;


    const frame = list.addStack();
    frame.layoutVertically();
    switch (config.widgetFamily) {
        case "small": {
            {// TOP ################
                // Title
                const row = frame.addStack();
                row.layoutHorizontally();
                row.addSpacer(2)
                text(row, '💰C', 14, "gold")
                text(row, 'rypto', 14, "normal")
                text(row, 'D', 14, "gold")
                text(row, 'epot💰', 14, "normal")
                row.addSpacer(2)
            }
            frame.addSpacer(10)
            {// MIDDLE #########################################################
                let col = frame.addStack();
                col.layoutVertically()
                {// DEPOT
                    let row = col.addStack();
                    row.layoutHorizontally()
                    text(row,
                        Num.format(total.value),
                        21,
                        "normal")
                }
                col.addSpacer(6)
                {//CHANGE 24H
                    let row = col.addStack();
                    row.layoutHorizontally()
                    image(row,
                        (total.pct24h) ? "arrow.up.forward.circle.fill" : "arrow.down.forward.circle.fill",
                        32,
                        (total.pct24h) ? "green" : "red")
                    row.addSpacer(2)
                    {// Texts
                        let col = row.addStack();
                        col.layoutVertically()
                        text(col,
                            Num.formatWithSign(total.c24h),
                            14,
                            (total.pct24h) ? "green" : "red")
                        col.addSpacer(2)
                        text(col,
                            Per.formatWithSign(total.pct24h),
                            8,
                            (total.pct24h) ? "green" : "red")
                    }
                    row.addSpacer(2)
                    {//24H Symbol
                        let col = row.addStack();
                        col.layoutVertically()
                        image(col,
                            "clock.arrow.circlepath",
                            20,
                            "normal")
                        col.addSpacer(1)
                        text(col,
                            "24H",
                            9,
                            "normal")
                    }
                }
                col.addSpacer(6)
                {// INVEST AND PROFIT
                    let row = col.addStack();
                    row.layoutHorizontally()
                    {//INVEST
                        let col = row.addStack();
                        col.layoutVertically()
                        text(col,
                            NumD.format(total.invest),
                            8,
                            "normal")
                        col.addSpacer(1)
                        text(col,
                            "INVESTMENT",
                            8,
                            "normal")
                    }
                    row.addSpacer(25)
                    {// PROFIT
                        let col = row.addStack();
                        col.layoutVertically()
                        text(col,
                            Per.formatWithSign(total.pctprofit),
                            8,
                            "normal")
                        col.addSpacer(1)
                        text(col,
                            "PROFIT",
                            8,
                            "normal")
                    }
                }
            }
            frame.addSpacer(3)
            {// BOTTOM #########################################################
                {// Last updated timestamp
                    let row = frame.addStack();
                    row.layoutHorizontally();
                    row.addSpacer(25)
                    text(row,
                        `${('' + date.getDate()).padStart(2, '0')}.${('' + (date.getMonth() + 1)).padStart(2, '0')}.${date.getFullYear()} ${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`,
                        8,
                        "gray")
                    row.addSpacer(25)
                }
            }
        }
            break;
        case "medium": {
            data = sort_filter(data, 'CHANGEPCT24HOUR')
            let data2 = sort_filter(data, 'PROFITPCT')
            {// TOP ################
                // Title
                const row = frame.addStack();
                row.layoutHorizontally();
                row.addSpacer(30)
                text(row, '💰C', 14, "gold")
                text(row, 'rypto', 14, "normal")
                text(row, 'D', 14, "gold")
                text(row, 'epot-', 14, "normal")
                text(row, 'E', 14, "gold")
                text(row, 'xtended', 14, "normal")
                text(row, 'V', 14, "gold")
                text(row, 'iew💰', 14, "normal")
                row.addSpacer(30)
            }
            frame.addSpacer(10)
            {// MIDDLE #########################################################
                let col = frame.addStack();
                col.layoutVertically();
                {// DEPOT PART
                    let row = col.addStack();
                    row.layoutHorizontally()
                    {//Depot Value
                        let col = row.addStack();
                        col.layoutVertically();
                        text(col,
                            "DEPOT VALUE",
                            7,
                            "normal")
                        text(col,
                            Num.format(total.value),
                            20,
                            "normal")
                    }
                    row.addSpacer(10)
                    image(row,
                        (total.pct24h) ? "arrow.up.forward.circle.fill" : "arrow.down.forward.circle.fill",
                        32,
                        (total.pct24h) ? "green" : "red")
                    row.addSpacer(10)
                    {// Texts
                        let col = row.addStack();
                        col.layoutVertically()
                        text(col,
                            Num.formatWithSign(total.c24h),
                            14,
                            (total.pct24h) ? "green" : "red")
                        col.addSpacer(2)
                        text(col,
                            Per.formatWithSign(total.pct24h),
                            8,
                            (total.pct24h) ? "green" : "red")
                    }
                    row.addSpacer(10)
                    {//24H Symbol
                        let col = row.addStack();
                        col.layoutVertically()
                        image(col,
                            "clock.arrow.circlepath",
                            20,
                            "normal")
                        col.addSpacer(1)
                        text(col,
                            "24H",
                            9,
                            "normal")
                    }
                }
                col.addSpacer(5)
                {// LISTS
                    let row = col.addStack();
                    row.layoutHorizontally()
                    {//COINS CHARTS
                        let col = row.addStack();
                        col.layoutVertically()
                        {//HEADER
                            let row = col.addStack();
                            row.layoutHorizontally()
                            text(row,
                                "_____🔝 12 COINS ",
                                10,
                                "normal")
                            image(row,
                                "clock.arrow.circlepath",
                                10,
                                "normal")
                            row.addSpacer(1)
                            text(row,
                                "24H ______",
                                10,
                                "normal")
                        }
                        col.addSpacer(1)
                        {// Make Sub Tables
                            let row = col.addStack();
                            row.layoutHorizontally()
                            for (let j = 0; j < Math.floor(((data.length > 12) ? 12 : data.length) / ENV.num_rows); j++) {
                                row.addSpacer(2)
                                let row2 = row.addStack();
                                row2.layoutHorizontally()
                                {
                                    let col = row2.addStack();
                                    col.layoutVertically()
                                    for (let i = j * ENV.num_rows; i < j * ENV.num_rows + ENV.num_rows; i++) {
                                        col.addSpacer(ENV.spacing)
                                        // Coin
                                        text(col,
                                            data[i]['CURRENCY'],
                                            8,
                                            "gray")
                                    }
                                }
                                {
                                    let col = row2.addStack();
                                    col.layoutVertically()
                                    for (let i = j * ENV.num_rows; i < j * ENV.num_rows + ENV.num_rows; i++) {
                                        col.addSpacer(ENV.spacing)
                                        // Value
                                        text(col,
                                            Per.formatWithSign(0.01 * data[i]['CHANGEPCT24HOUR']),
                                            8,
                                            (data[i]['CHANGEPCT24HOUR'] >= 0) ? ("green") : ("red"))
                                    }
                                }
                            }
                        }
                    }
                    row.addSpacer(2)
                    {// TOP4 PROFIT COINS
                        let col = row.addStack();
                        col.layoutVertically()
                        //HEADER
                        text(col,
                            "______🔝 4 PROFIT______",
                            10,
                            "normal")
                        let row2 = col.addStack();
                        row2.layoutHorizontally()
                        {
                            let col = row2.addStack();
                            col.layoutVertically()
                            for (let i = 0; i < ENV.num_rows; i++) {
                                col.addSpacer(ENV.spacing)
                                // Coin
                                text(col,
                                    data2[i]['CURRENCY'],
                                    8,
                                    "gray")
                            }
                        }
                        {
                            let col = row2.addStack();
                            col.layoutVertically()
                            for (let i = 0; i < ENV.num_rows; i++) {
                                col.addSpacer(ENV.spacing)
                                {
                                    let row = col.addStack();
                                    row.layoutHorizontally()
                                    // Value
                                    text(row,
                                        Num.formatWithSign(data2[i]['PROFIT']),
                                        8,
                                        "normal")
                                    row.addSpacer(2)
                                    // Value
                                    text(row,
                                        "( " + Per.formatWithSign(0.01 * data2[i]['PROFITPCT']) + " )",
                                        8,
                                        "normal")
                                }
                            }
                        }
                    }
                }
            }
            frame.addSpacer(3)
            {// BOTTOM #########################################################
                {// Last updated timestamp
                    let row = frame.addStack();
                    row.layoutHorizontally();
                    row.addSpacer(110)
                    text(row,
                        `${('' + date.getDate()).padStart(2, '0')}.${('' + (date.getMonth() + 1)).padStart(2, '0')}.${date.getFullYear()} ${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`,
                        8,
                        "gray")
                    row.addSpacer(110)
                }
            }
        }
            break;
        case "large": {
            data = sort_filter(data, 'PROFITPCT')
            {// TOP ################
                // Title
                const row = frame.addStack();
                row.layoutHorizontally();
                row.addSpacer(30)
                text(row, '💰C', 14, "gold")
                text(row, 'rypto', 14, "normal")
                text(row, 'D', 14, "gold")
                text(row, 'epot-', 14, "normal")
                text(row, 'D', 14, "gold")
                text(row, 'etailled', 14, "normal")
                text(row, 'V', 14, "gold")
                text(row, 'iew💰', 14, "normal")
                row.addSpacer(30)
            }
            frame.addSpacer(10)
            {// MIDDLE #########################################################
                let row = frame.addStack();
                row.layoutHorizontally()
                {// COIN PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    text(col,
                        "⚫️COIN",
                        ENV.text_size,
                        "normal")
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF COINS
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        let row = col.addStack();
                        row.layoutHorizontally()
                        text(row,
                            (data[i]['PROFIT'] >= 0) ? "🟢" : "🔴",
                            ENV.text_size,
                            "normal")
                        text(row,
                            data[i]['CURRENCY'],
                            ENV.text_size,
                            "gray")
                    }
                }
                row.addSpacer(2)
                {// INVEST PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    text(col,
                        "INVEST",
                        ENV.text_size,
                        "normal")
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF INVESTMENTS
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        // Value
                        text(col,
                            NumD.format(data[i]['INVEST']),
                            ENV.text_size,
                            "normal")
                    }
                }
                row.addSpacer(2)
                {// PROFIT PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    text(col,
                        "PROFIT",
                        ENV.text_size,
                        "normal")
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF PROFIT
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        // Value
                        text(col,
                            NumD.formatWithSign(Math.round(data[i]['PROFIT'])),
                            ENV.text_size,
                            "normal")
                    }
                }
                row.addSpacer(2)
                {// PROFITPCT PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    text(col,
                        "[%]",
                        ENV.text_size,
                        "normal")
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF PROFITPCT
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        // Value
                        text(col,
                            PerD.formatWithSign(0.01 * Math.round(data[i]['PROFITPCT'])),
                            ENV.text_size,
                            "normal")
                    }
                }
                row.addSpacer(2)
                {// CHANGE24 PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    {
                        let row = col.addStack();
                        row.layoutHorizontally()
                        image(row,
                            "clock.arrow.circlepath",
                            ENV.text_size,
                            "normal")
                        row.addSpacer(1)
                        text(row,
                            "24H",
                            ENV.text_size,
                            "normal")
                    }
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF CHANGE24
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        // Value
                        text(col,
                            Num.formatWithSign(data[i]['VALUECHANGE24HOUR']),
                            ENV.text_size,
                            (data[i]['VALUECHANGE24HOUR'] >= 0) ? ("green") : ("red"))
                    }
                }
                row.addSpacer(2)
                {// CHANGE24PCT PART-------------------------------------------------------
                    let col = row.addStack();
                    col.layoutVertically()
                    text(col,
                        "[%]",
                        ENV.text_size,
                        "normal")
                    col.addSpacer(ENV.headerspacing)
                    // LIST OF CHANGE24PCT
                    for (let i = 0; i < ((data.length < ENV.list_len) ? data.length : ENV.list_len); i++) {
                        col.addSpacer(ENV.spacing)
                        // Value
                        text(col,
                            Per.formatWithSign(0.01 * data[i]['CHANGEPCT24HOUR']),
                            ENV.text_size,
                            (data[i]['CHANGEPCT24HOUR'] >= 0) ? ("green") : ("red"))
                    }
                }
            }
            frame.addSpacer(3)
            {// BOTTOM #########################################################
                {// Last updated timestamp
                    let row = frame.addStack();
                    row.layoutHorizontally();
                    row.addSpacer(110)
                    text(row,
                        `${('' + date.getDate()).padStart(2, '0')}.${('' + (date.getMonth() + 1)).padStart(2, '0')}.${date.getFullYear()} ${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`,
                        8,
                        "gray")
                    row.addSpacer(110)
                }
            }
        }
            break;
    }
    return list
}