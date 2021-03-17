const USDorEUR = "EUR"  // Your preferred currency to show values EUR or USD
var data
const widgetInput = args.widgetParameter;

// Check if Input is correct
if (widgetInput != null) {
    data = JSON.parse(widgetInput)
} else {
    throw new Error("No Widget parameter set. Expected format: JSON {'Currency':NAMECODE, 'Amount':AMOUNTOFCOIN, 'Invest':INVESTMONEY}")
}

// Function to generate apiURL for specific coin
let apiURL = (coin, USDorEUR) => `https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=${USDorEUR}`

// Function to make the request from CoinMarketCap
async function requestPrice(coin) {
    return await new Request(apiURL(coin, USDorEUR)).loadJSON()
}

// Request all Coins in Wallet:
let i;
for (i=0; i < data.length; i++) {
    let price = parseFloat((await requestPrice(data[i].Currency))[USDorEUR])
    let amount = parseFloat(data[i].Amount)
    data[i].Invest = parseInt(data[i].Invest)
    data[i]['Value'] = amount * price
    data[i]['Profit'] = data[i].Value - data[i].Invest
    data[i]['WinLoss'] = data[i].Profit / data[i].Invest * 100
}

// Calculate Sums over Coins in Wallet:
var totals = {};
totals['Value'] = data.map(item => item.Value).reduce((prev, next) => prev + next);
totals['Invest'] = data.map(item => item.Invest).reduce((prev, next) => prev + next);
totals['Profit'] = totals['Value']-totals['Invest']
totals['WinLoss'] = totals['Profit'] / totals['Invest']

// Create the Widget
let widget = await createWidget(data, totals)

// Decide which Widget-Type is shown in Scriptable Preview
if (!config.runsInWidget) {
    await widget.presentSmall()
    // await widget.presentMedium()
    // await widget.presentLarge()
}

// Start and run Widget
Script.setWidget(widget)
Script.complete()

// Define colors:
var bg_color = Color.dynamic(new Color('#FFFFFF'), new Color('#111111'));
var text_color = Color.dynamic(new Color('#111111'), new Color('#FFFFFF'));
var text_color_red = Color.dynamic(new Color('#FF0000'), new Color('#FF0000'));
var text_color_green = Color.dynamic(new Color('#00FF00'), new Color('#00FF00'));
var text_color_blue = Color.dynamic(new Color('#0000FF'), new Color('#0000FF'));

// Function to build and format the Widget itself
async function createWidget(data, totals) {
    let numFormat = new Intl.NumberFormat('de-DE',
        { style: 'currency', currency: USDorEUR,
            minimumFractionDigits: 2 })
    let perFormat = new Intl.NumberFormat('de-DE',
        { style: 'percent',
            minimumFractionDigits: 2 })

    const list = new ListWidget()
    list.setPadding(1, 1, 1, 1)
    list.backgroundColor = Color.dynamic(new Color('#FFFFFF'), new Color('#111111'));

    let topLineStack = list.addStack()
    let header = topLineStack.addText('💲Cryptos💲')
    header.centerAlignText()
    header.font = Font.boldSystemFont(25)
    header.textColor = Color.blue()

    list.addSpacer(5)

    let firstLineStack = list.addStack()
    let depotName = firstLineStack.addText('Depot: ')
    depotName.font = Font.boldSystemFont(8)
    depotName.textColor = Color.dynamic(new Color('#111111'), new Color('#FFFFFF'))

    firstLineStack.layoutHorizontally()
    firstLineStack.addSpacer(5)

    let firstlinecol = firstLineStack.addStack()
    let valName = firstlinecol.addText(numFormat.format(totals.Value))
    valName.font = Font.boldSystemFont(20)
    valName.textColor = Color.green()

    list.addSpacer(5)

    let secondLineStack = list.addStack()
    let investName = secondLineStack.addText('Invest: ')
    investName.font = Font.boldSystemFont(8)
    investName.textColor = Color.dynamic(new Color('#111111'), new Color('#FFFFFF'))

    secondLineStack.layoutHorizontally()
    secondLineStack.addSpacer(5)

    let secondlinecol = secondLineStack.addStack()
    let val1Name = secondlinecol.addText(numFormat.format(totals.Invest))
    val1Name.font = Font.boldSystemFont(20)
    val1Name.textColor = Color.orange()

    list.addSpacer(5)

    let thirdLineStack = list.addStack()
    let profitName = thirdLineStack.addText('Profit: ')
    profitName.font = Font.boldSystemFont(8)
    profitName.textColor = Color.dynamic(new Color('#111111'), new Color('#FFFFFF'))

    thirdLineStack.layoutHorizontally()
    thirdLineStack.addSpacer(5)

    let thirdlinecol = thirdLineStack.addStack()
    let val2Name = thirdlinecol.addText(numFormat.format(totals.Profit))
    val2Name.font = Font.boldSystemFont(10)
    val2Name.textColor = Color.dynamic(new Color('#111111'), new Color('#FFFFFF'))

    thirdLineStack.addSpacer(5)

    let thirdlinecol2 = thirdLineStack.addStack()
    let val3Name = thirdlinecol2.addText('(' + perFormat.format(totals.WinLoss) + ')')
    val3Name.font = Font.boldSystemFont(10)
    if (totals.Profit > 0) {
        val3Name.textColor = Color.green()
    } else {
        val3Name.textColor = Color.red()
    }
    return list
}
