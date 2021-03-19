// Version 0.1
// Author: Martin Knoche

const USDorEUR = "EUR"  // Your preferred currency to show values EUR or USD
const widgetInput = args.widgetParameter;
var data = {};
var total = {};
var best_profit = {}
var best_winloss = {}

// Define colors and fonts:
const ENV = {
    "colors": {
        "bg": Color.dynamic(new Color('#FFFFFF'), new Color('#111111')),
        "normal": Color.dynamic(new Color('#111111'), new Color('#FFFFFF')),
        "red": Color.dynamic(new Color('#FF0000'), new Color('#FF0000')),
        "green": Color.dynamic(new Color('#00FF00'), new Color('#00FF00')),
        "blue": Color.dynamic(new Color('#0000FF'), new Color('#0000FF')),
        "gray": Color.gray()
    },
    "fonts": {
        "small" : Font.boldSystemFont(7),
        "intermediate" : Font.boldSystemFont(9),
        "medium" : Font.boldSystemFont(12),
        "large" : Font.boldSystemFont(20),
        "bottom" : Font.boldSystemFont(8),
        "top": Font.boldSystemFont(16)
    }
}

// Check if input is correct
if (widgetInput != null) {
    data = JSON.parse(widgetInput)
} else {
    throw new Error("No Widget parameter set. Expected format: JSON {'Currency':NAMECODE, 'Amount':AMOUNTOFCOIN, 'Invest':INVESTEDMONEY}")
}

// Function to generate apiURL for specific coin
let apiURL = (coin, USDorEUR) => `https://min-api.cryptocompare.com/data/price?fsym=${coin}&tsyms=${USDorEUR}`;

// Function to make the request from CoinMarketCap
async function requestPrice(coin) {
    return await new Request(apiURL(coin, USDorEUR)).loadJSON()
}

async function load_screen() {
    let icon = widget.addImage(bitsymbol)
    icon.tintColor = primaryColor
    icon.imageSize = new Size(32, 32)
    icon.centerAlignImage()
    widget.addSpacer(8)
    const loading = widget.addText("Refreshing data ... ")
    loading.font = ENV.fonts.large
    loading.textColor = ENV.colors.normal
    loading.centerAlignText()
}

// Function to get data from last update and store
function get_and_write_last_data(data) {
    let last_time
    const fm = FileManager.local();
    const dir = fm.documentsDirectory();
    const path = fm.joinPath(dir, 'cryptwidget_cache.json');
    if (fm.fileExists(path)) {
        last_time = fm.readString(path);
    } else {
        last_time = data;
    }
    fm.writeString(path, data);
    return last_time
}

// Request price of all coins in wallet:
for (let i=0; i < data.length; i++) {
    data[i]['Price'] = (await requestPrice(data[i].Currency))[USDorEUR]
}

// Load and write last data:
let last_data = JSON.parse(get_and_write_last_data(JSON.stringify(data)))


// Add Value, LastValue, Profit, LastProfit, WinLoss, LastWinLoss
for (let i=0; i < data.length; i++) {
    data[i]['Amount'] = parseFloat(data[i].Amount);
    data[i]['Invest'] = parseFloat(data[i].Invest);
    data[i]['Price'] = parseFloat(data[i].Price);
    data[i]['Value'] = data[i].Amount * data[i].Price;
    data[i]['Profit'] = data[i].Value - data[i].Invest;
    data[i]['WinLoss'] = data[i].Profit / data[i].Invest;
    data[i]['LastPrice'] = parseFloat(last_data[i].Price);
    data[i]['LastValue'] = parseFloat(last_data[i].Amount) * data[i].LastPrice;
    data[i]['LastProfit'] = data[i].Value - data[i].LastValue;
    data[i]['LastWinLoss'] = data[i].LastProfit / data[i].Invest;
}

// Calculate total sums
total['Value'] = data.map(item => item.Value).reduce((prev, next) => prev + next);
total['Invest'] = data.map(item => item.Invest).reduce((prev, next) => prev + next);
total['Profit'] = total.Value - total.Invest;
total['WinLoss'] = total.Profit / total.Invest;
total['LastValue'] = data.map(item => item.LastValue).reduce((prev, next) => prev + next);
total['LastProfit'] = total.Value - total.LastValue;
total['LastWinLoss'] = total.LastProfit / total.Invest;


function sortByAttribue(arr, attribute) {
    return arr.sort(function(a,b) {
        return parseFloat(a[attribute]) < parseFloat(b[attribute]);
    });
}

// Find best performing coin
best_profit['Currency'] = sortByAttribue(data, "Profit")[0].Currency
best_profit['Profit'] = sortByAttribue(data, "Profit")[0].Profit
best_winloss['Currency'] = sortByAttribue(data, "WinLoss")[0].Currency
best_winloss['WinLoss'] = sortByAttribue(data, "WinLoss")[0].WinLoss


// Create the Widget
let widget = await createWidget(data, total)

// Decide which widget-type is shown in scriptable preview
if (!config.runsInWidget) {
    await widget.presentSmall()
    // await widget.presentMedium()
    // await widget.presentLarge()
}

// Start and run widget
Script.setWidget(widget)
Script.complete()


// Function to build and format the Widget itself
async function createWidget(data, totals) {
    // Define currency and percentage format
    const numFormat = new Intl.NumberFormat('de-DE',
        { style: 'currency', currency: USDorEUR, minimumFractionDigits: 2 })
    const perFormat = new Intl.NumberFormat('de-DE',
        { style: 'percent', minimumFractionDigits: 2 })

    const list = new ListWidget()

    // cache data for at least 5 minutes
    list.refreshAfterDate = new Date(Date.now() + 300000);

    // Get refresh date
    let date = new Date(Date.now());

    list.setPadding(1, 1, 1, 1);
    list.backgroundColor = ENV.colors.bg;

    let row_top = list.addStack();
    row_top.addSpacer(20);
    let top_text = row_top.addText('📈 Cryptos');
    top_text.font = ENV.fonts.top;
    top_text.textColor = ENV.colors.normal;

    list.addSpacer(3);
    let row_1 = list.addStack();
    row_1.layoutHorizontally();
    row_1.addSpacer(2);
    let col_1_row_1 = row_1.addStack();
    let text_total_value = col_1_row_1.addText(numFormat.format(totals.Value))
    text_total_value.font = ENV.fonts.large
    text_total_value.textColor = ENV.colors.normal
    row_1.addSpacer(2);
    let col_2_row_1 = row_1.addStack();
    let text_depot = col_2_row_1.addText("DEPOT")
    text_depot.font = ENV.fonts.small
    text_depot.textColor = ENV.colors.normal


    list.addSpacer(3)
    let row_2 = list.addStack();
    row_2.layoutHorizontally();
    row_2.addSpacer(2);
    let col_1_row_2 = row_2.addStack();
    let text_total_last_profit = col_1_row_2.addText(numFormat.format(totals.LastProfit))
    text_total_last_profit.rightAlignText()
    text_total_last_profit.font = ENV.fonts.medium
    let updown = "↗️"
    if (totals.LastProfit >= 0) {
        text_total_last_profit.textColor = ENV.colors.green
    } else {
        updown = "↘️"
        text_total_last_profit.textColor = ENV.colors.red
    }
    row_2.addSpacer(2);
    let col_2_row_2 = row_2.addStack();
    let text_total_last_profit_str = col_2_row_2.addText(updown + "️ to last refresh")
    text_total_last_profit_str.font = ENV.fonts.small
    text_total_last_profit_str.textColor = ENV.colors.normal

    list.addSpacer(3)
    let row_3 = list.addStack();
    row_3.layoutHorizontally();
    row_3.addSpacer(2);
    let col_1_row_3 = row_3.addStack();
    let text_invest = col_1_row_3.addText(numFormat.format(totals.Invest))
    text_invest.font = ENV.fonts.intermediate
    text_invest.textColor = ENV.colors.normal

    row_3.addSpacer(2);
    let col_2_row_3 = row_3.addStack();
    let text_profit_str = col_2_row_3.addText("➡️")
    text_profit_str.font = ENV.fonts.intermediate
    text_profit_str.textColor = ENV.colors.normal

    row_3.addSpacer(2);
    let col_3_row_3 = row_3.addStack();
    let text_profit = col_3_row_3.addText(numFormat.format(totals.Profit))
    text_profit.font = ENV.fonts.intermediate
    if (totals.Profit >= 0) {
        text_profit.textColor = ENV.colors.green
    } else {
        text_profit.textColor = ENV.colors.red
    }


    list.addSpacer(3)
    let row_4 = list.addStack();
    row_4.layoutHorizontally();
    row_4.addSpacer(2);
    let col_1_row_4 = row_4.addStack();
    let text_invest_str = col_1_row_4.addText("INVEST")
    text_invest_str.font = ENV.fonts.small
    text_invest_str.textColor = ENV.colors.normal
    row_4.addSpacer(50);
    let col_2_row_4 = row_4.addStack();
    let text_roi_str = col_2_row_4.addText("RoI")
    text_roi_str.font = ENV.fonts.small
    text_roi_str.textColor = ENV.colors.normal


    list.addSpacer(3)
    let row_5 = list.addStack();
    row_5.layoutHorizontally();
    row_5.addSpacer(2);
    let col_1_row_5 = row_5.addStack();
    let text_BestProfit_str = col_1_row_5.addText("🥇 Profit: ")
    text_BestProfit_str.font = ENV.fonts.small
    text_BestProfit_str.textColor = ENV.colors.normal

    row_5.addSpacer(2);
    let col_2_row_5 = row_5.addStack();
    let text_BestProfit_curr = col_2_row_5.addText(best_profit.Currency)
    text_BestProfit_curr.font = ENV.fonts.medium
    text_BestProfit_curr.textColor = ENV.colors.normal

    row_5.addSpacer(2);
    let col_3_row_5 = row_5.addStack();
    let text_Profit = col_3_row_5.addText(numFormat.format(best_profit.Profit))
    text_Profit.font = ENV.fonts.medium
    if (best_profit.Profit >= 0) {
        text_Profit.textColor = ENV.colors.green
    } else {
        text_Profit.textColor = ENV.colors.red
    }


    list.addSpacer(3)
    let row_6 = list.addStack();
    row_6.layoutHorizontally();
    row_6.addSpacer(2);
    let col_1_row_6 = row_6.addStack();
    let text_BestWinLoss_str = col_1_row_6.addText("🥇 WinLoss: ")
    text_BestWinLoss_str.font = ENV.fonts.small
    text_BestWinLoss_str.textColor = ENV.colors.normal

    row_6.addSpacer(2);
    let col_2_row_6 = row_6.addStack();
    let text_BestWinLoss_curr = col_2_row_6.addText(best_winloss.Currency)
    text_BestWinLoss_curr.font = ENV.fonts.medium
    text_BestWinLoss_curr.textColor = ENV.colors.normal

    row_6.addSpacer(2);
    let col_3_row_6 = row_6.addStack();
    let text_BestWinLoss = col_3_row_6.addText(perFormat.format(best_winloss.WinLoss))
    text_BestWinLoss.font = ENV.fonts.medium
    if (best_winloss.WinLoss >= 0) {
        text_BestWinLoss.textColor = ENV.colors.green
    } else {
        text_BestWinLoss.textColor = ENV.colors.red
    }


    list.addSpacer(3)
    let row_bottom = list.addStack();
    // Last updated timestamp
    row_bottom.addSpacer(20);
    let lastUpdateDateString = "🔄 : " + `${('' + date.getDate()).padStart(2, '0')}.${('' + (date.getMonth() + 1)).padStart(2, '0')}.${date.getFullYear()} ${('' + date.getHours()).padStart(2, '0')}:${('' + date.getMinutes()).padStart(2, '0')}`
    let bottom_text = row_bottom.addText(lastUpdateDateString);
    bottom_text.centerAlignText();
    bottom_text.font = ENV.fonts.bottom;
    bottom_text.textColor = ENV.colors.gray;
    bottom_text.textOpacity = 0.7;

    return list
}
