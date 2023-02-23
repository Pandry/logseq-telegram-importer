import '@logseq/libs'

async function main () {
    const updates = await getMessages(logseq.settings["TelegramBotToken"])
    const messages = getLinksFromUpdates(updates,logseq.settings["AllowedUsers"].split(",").map(i => Number(i)))
    for (const message of messages){
        for (const link of message){
            const {url, title} = await resolveUrlAndTitle(link)
            // If it's HN AND it's not a ask hn series, ignore
            if (url.toLowerCase().indexOf("https://news.ycombinator.com/") >=0 && title.toLowerCase().indexOf(" hn:") == -1 )
                continue
            addArticle(url, title)
            console.log("Adding article ",title)
        }
    };
}


async function getMessages(telegramToken: string, offset?:Number):Promise<Object[]> {
    const apiEndpoint = "https://api.telegram.org/"
    const updatesEndpoint = "getUpdates"

    const allowed_updates:String[] = []
    const timeout:Number = 0
    const limit:Number = 100 // Goes from 1 to 100

    // Get updates
    const endpoint = apiEndpoint + "bot" + telegramToken + "/" + updatesEndpoint;

    const offsetArgument = offset !== null? "?offset="+offset : "" 
    const endpointWithOffset = endpoint + offsetArgument

    const updates = await fetch(endpointWithOffset)
        .then(res => res.json())
        .catch((err) => {throw new Error("Unable to fetch the telegram API endpoint (or parsing the JSON): "+ err)})

    if (!updates.ok){
        throw new Error("Not ok with telegram API endpoint")
    }
    //Confirm the updates to not have to face them again
    if (updates.ok && updates.result.length > 0)
        await fetch(endpoint + "?offset=" + (updates.result[updates.result.length -1].update_id +1) )

    let results:Object[] = []
    for (const update of updates.result){
        const message = update.message
        results.push(message)
    }

    return results
}

function getLinksFromUpdates(messages:any, users:Number[]){
    let results:Array<string[]> = []
    for (const message of messages){
        if (users.indexOf(message.from.id) != -1){
            let messageContent:string[] = []
            let foundEntities = false
            for (const entity of message.entities||[]){
                if (entity.type == "text_link"){
                    messageContent.push(entity.url)
                    foundEntities = true
                } else if (entity.type == "url"){
                    const content = message.text.substr(entity.offset, entity.length)
                    messageContent.push(content)
                    foundEntities = true
                }
            }
            if (!foundEntities){
                messageContent.push(message.text)
            }

            results.push(messageContent)
        }
    }
    return results
}

async function resolveUrlAndTitle(url:string){
    let pageUrl = url
    let pageTitle = url
    try{
        let r = await fetch(url)
        pageUrl = r.url
        let pageRawBody = await r.text()
        pageTitle = (new DOMParser()).parseFromString(pageRawBody, "text/html").title;
        return {url: pageUrl, title: pageTitle}
    }catch(ex) {
        console.error("Encountered error while fetching the URL", pageUrl)
    }finally{
        return {url: pageUrl, title: pageTitle}
    }
}

function addArticle(url:string, title:string){
    const currentDate = new Date()
    const currentDateString = currentDate.getDate().toString().padStart(2, "0") + "-" + (currentDate.getMonth()+1).toString().padStart(2, "0") + "-" + currentDate.getFullYear()
    console.log(currentDateString, url, title)
    logseq.Editor.insertBlock(currentDateString, `[${title}](${url}) #Articles #Todo`)
}


// bootstrap
logseq.ready(main).catch(console.error)

const settings = [
    {
        key: "TelegramBotToken",
        type: "string",
        title: "Telegram bot token",
        description: "There you insert the telegram bot token",
        default: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef"
    },{
        key: "AllowedUsers",
        type: "string",
        title: "Allowed users",
        description: "Comma-separated allowed users to send messages to the bot",
        default: "1263456789,1263456789"
    },
]
logseq.useSettingsSchema(settings)

// getBot returns the bot name (using the getMe endpoint)
function getBot(telegramToken: string) : string {
    return ""
}
