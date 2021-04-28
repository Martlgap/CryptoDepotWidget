const USDorEUR = "EUR"  // Your preferred currency to show values EUR or USD
const widgetInput = args.widgetParameter;
const ENV = {// Define colors and fonts:
    "colors": {
        "bg": Color.dynamic(new Color('#FFFFFF'), new Color('#111111')),
        "normal": Color.dynamic(new Color('#111111'), new Color('#FFFFFF')),
        "red": Color.dynamic(new Color('#FF0000'), new Color('#FF0000')),
        "green": Color.dynamic(new Color('#00FF00'), new Color('#00FF00')),
        "blue": Color.dynamic(new Color('#0000FF'), new Color('#0000FF')),
        "gray": Color.gray(),
        "gold": new Color('#D4AF37')
    },
    "fonts": {
        "small" : Font.boldSystemFont(7),
        "intermediate" : Font.boldSystemFont(9),
        "inter" : Font.boldSystemFont(10),
        "medium" : Font.boldSystemFont(12),
        "depot" : Font.boldSystemFont(21),
        "bottom" : Font.boldSystemFont(8),
        "top": Font.boldSystemFont(16),
        "title": Font.boldSystemFont(14)
    }
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

// Sort ArrayByAttribute
function sortByAttribute(arr, attribute) {
    return arr.sort(function(a,b) {
        return parseFloat(a[attribute]) < parseFloat(b[attribute]);
    });
}

// Function to take top 3 and worse 3
function get_top_nr(depot) {
    if (Math.floor(depot.length, 2) < 3) {
        return Math.floor(depot.length, 2)
    } else {
        return 3
    }
}

// Make Array of coin names
let coins = Array()
depot.forEach(function(val, index) {coins[index] = val.Currency})

// Request data for all coins from CryptoCompare
let data = await requestPrice(coins)
data = data.RAW

// Add depot amounts and invests to data
depot.map(function(elem) {data[elem.Currency][USDorEUR]['PRICE'] = parseFloat(data[elem.Currency][USDorEUR]['PRICE'])})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['CHANGEPCT24HOUR'] = parseFloat(data[elem.Currency][USDorEUR]['CHANGEPCT24HOUR'])})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['INVEST'] = parseFloat(elem.Invest)})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['AMOUNT'] = parseFloat(elem.Amount)})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['VALUE'] = data[elem.Currency][USDorEUR]['AMOUNT'] * data[elem.Currency][USDorEUR]['PRICE']})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['PROFIT'] = data[elem.Currency][USDorEUR]['VALUE'] - data[elem.Currency][USDorEUR]['INVEST']})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['WINLOSS'] = data[elem.Currency][USDorEUR]['PROFIT'] / data[elem.Currency][USDorEUR]['INVEST']})
depot.map(function(elem) {data[elem.Currency][USDorEUR]['VALUECHANGE24HOUR'] = data[elem.Currency][USDorEUR]['CHANGEPCT24HOUR'] * data[elem.Currency][USDorEUR]['VALUE'] / 100})

// Aggregate Sums
let total = {}
total['invest'] = Object.values(data).reduce((prev, next) => prev + next[USDorEUR]['INVEST'], 0)
total['value'] = Object.values(data).reduce((prev, next) => prev + next[USDorEUR]['VALUE'], 0)
total['profit'] = Object.values(data).reduce((prev, next) => prev + next[USDorEUR]['PROFIT'], 0)
total['valuechange24'] = Object.values(data).reduce((prev, next) => prev + next[USDorEUR]['VALUECHANGE24HOUR'], 0)

// Create the Widget
let widget = await createWidget(data, total)

config.widgetFamily = config.widgetFamily || 'small'


// Create the Widget
if (!config.runsInWidget) {
// Show Widget Preview
    await widget.presentSmall()
} else {
// Tell the system to show the widget.
    Script.setWidget(widget)
    Script.complete()
}


// Function to build and format the Widget itself
async function createWidget(data, totals) {
    // Define currency and percentage format
    const Num = new Intl.NumberFormat('de-DE',{ style: 'currency', currency: USDorEUR, minimumFractionDigits: 2 })
    const NumD = new Intl.NumberFormat('de-DE',{ style: 'currency', currency: USDorEUR})
    Intl.NumberFormat.prototype.formatWithSign = function(x)
    {
        let y = this.format(x);
        return x < 0 ? y : '+' + y;
    }
    const Per = new Intl.NumberFormat('de-DE',{ style: 'percent', minimumFractionDigits: 2 })
    const list = new ListWidget()

    // cache data for at least 10min
    list.refreshAfterDate = new Date(Date.now() + 1800000);

    // Get refresh date
    let date = new Date(Date.now());

    list.setPadding(8,8,8,8);
    list.backgroundColor = ENV.colors.bg;


    const content = list.addStack();
    content.layoutVertically()

    // TITLE
    const title = content.addStack(); title.layoutHorizontally(); title.centerAlignContent()
    {let txt = title.addText('💰C'); txt.textColor = ENV.colors.gold; txt.font = ENV.fonts.title}
    {let txt = title.addText('rypto'); txt.textColor = ENV.colors.normal; txt.font = ENV.fonts.title}
    {let txt = title.addText('D'); txt.textColor = ENV.colors.gold; txt.font = ENV.fonts.title}
    {let txt = title.addText('epot💰'); txt.textColor = ENV.colors.normal; txt.font = ENV.fonts.title}

    content.addSpacer(10)

    // DEPOT VALUE
    {let txt = content.addText(NumD.format(totals.value)); txt.font = ENV.fonts.depot; txt.textColor = ENV.colors.normal;}

    content.addSpacer(10)

    // VALUE CHANGE 24H
    const valuechange24 = content.addStack();
    valuechange24.layoutHorizontally();

    // IF POSITIVE
    if (totals.valuechange24 >= 0) {
        // Rise or Fall Symbol
        {
            let img = valuechange24.addImage(SFSymbol.named("arrow.up.forward.circle.fill").image)
            img.tintColor = ENV.colors.green
            img.imageSize = new Size(32, 32)
        }
        valuechange24.addSpacer(2)
        // Texts
        {
            texts = valuechange24.addStack();
            texts.layoutVertically();

            // Absolute Value
            {let txt = texts.addText(Num.formatWithSign(totals.valuechange24)); txt.font = ENV.fonts.medium; txt.textColor = ENV.colors.green;}
            // Percentage
            {let txt = texts.addText("(" + Per.formatWithSign(totals.valuechange24 / totals.value) + ")"); txt.font = ENV.fonts.small; txt.textColor = ENV.colors.green;}
        }

    } else {
        // IF NEGATIVE
        {
            let img = valuechange24.addImage(SFSymbol.named("arrow.down.forward.circle.fill").image)
            img.tintColor = ENV.colors.red
            img.imageSize = new Size(32, 32)
        }
        // Texts
        {
            texts = valuechange24.addStack();
            texts.layoutVertically();

            // Absolute Value
            {let txt = texts.addText(Num.formatWithSign(totals.valuechange24)); txt.font = ENV.fonts.medium; txt.textColor = ENV.colors.red;}
            // Percentage
            {let txt = texts.addText("(" + Per.formatWithSign(totals.valuechange24 / totals.value) + ")"); txt.font = ENV.fonts.small; txt.textColor = ENV.colors.red;}
        }

    }
    valuechange24.addSpacer(2)
    // 24H Symbol
    {
        let valuechange24top = valuechange24.addStack()
        valuechange24top.layoutVertically()
        {
            let img = valuechange24top.addImage(SFSymbol.named("clock.arrow.circlepath").image)
            img.tintColor = ENV.colors.normal
            img.imageSize = new Size(20, 20)
        }
        {
            let txt = valuechange24top.addText("  24h")
            txt.font = ENV.fonts.intermediate
            txt.textColor = ENV.colors.normal
        }
    }
    content.addSpacer(10)
    let row_3 = content.addStack();
    row_3.layoutHorizontally();
    row_3.addSpacer(2);
    let col_1_row_3 = row_3.addStack();
    {
        let txt = col_1_row_3.addText(Num.format(totals.invest))
        txt.font = ENV.fonts.intermediate
        txt.textColor = ENV.colors.normal
    }

    row_3.addSpacer(4);
    let col_2_row_3 = row_3.addStack();
    {
        let txt = col_2_row_3.addText(" 📈 ")
        txt.font = ENV.fonts.intermediate
        txt.textColor = ENV.colors.normal
    }
    row_3.addSpacer(4);
    let col_3_row_3 = row_3.addStack();
    {
        let txt = col_3_row_3.addText(Per.format(totals.profit / totals.invest))
        txt.font = ENV.fonts.intermediate
        txt.textColor = ENV.colors.normal
    }
    content.addSpacer(3)
    let row_4 = content.addStack();
    row_4.layoutHorizontally();
    row_4.addSpacer(2);
    let col_1_row_4 = row_4.addStack();
    {
        let txt = col_1_row_4.addText("INVESTMENT")
        txt.font = ENV.fonts.bottom
        txt.textColor = ENV.colors.normal
    }
    row_4.addSpacer(40);
    let col_2_row_4 = row_4.addStack();
    {
        let txt = col_2_row_4.addText("PROFIT")
        txt.font = ENV.fonts.bottom
        txt.textColor = ENV.colors.normal
    }
    content.addSpacer(3)
    // Last updated timestamp
    {
        let txt = list.addText(`${('' + date.getDate()).padStart(2, '0')}.${('' + (date.getMonth() + 1)).padStart(2, '0')}.${date.getFullYear()} ${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`);
        txt.centerAlignText()
        txt.font = ENV.fonts.bottom
        txt.textColor = ENV.colors.gray
    }

    return list
}