/**
 * 將RIS格式的檔案輸出成DSpace上傳程式可用的metadata.csv格式
 * 適用於華藝線上圖書館，在期刊文章列表勾選書目，並點選「書目匯出」，選擇Ris格式，即可利用此程式產生metadata
 *
 */
const request = require("request");
const readline = require("linebyline");
const fs = require("fs");
const { Parser } = require('json2csv');
const outputFileName = "metadata.csv";

const util = require('util');
const readdir = util.promisify(fs.readdir);

const fields = [
    "dc.contributor.author[zh_TW]",
    "dc.contributor.author[en_US]",
    "dc.title[zh_TW]",
    "dc.title[en_US]",
    "dc.date[zh_TW]",
    "contents",
    "dc.description.abstract[zh_TW]",
    "dc.description.abstract[en_US]",
    "dc.relation[zh_TW]",
    "dc.subject[zh_TW]",
    "dc.subject[en_US]",
    "dc.type[zh_TW]"];
const opts = { fields };

const risFileBasePath = ".\\ris\\";

/// HERE start
const _ = runDirs();

/// Read directories
async function runDirs() {
    let dirs = [];
    try {
        dirs = await readdir(risFileBasePath);
    } catch (e) {
        console.log('e', e);
    }

    dirs.forEach(async dir => {
        let path = risFileBasePath + '\\' + dir;
        if (!fs.lstatSync(path).isDirectory()) return;
        let file;
        try {
            let files = await readdir(path);
            for (let j = 0; j < files.length; j++) {
                if (files[j].endsWith(".ris")) {
                    file = files[j];
                }
            }

            let risFile = readline(path + "\\" + file);
            let result = await risToJson(risFile);
            try {
                const parser = new Parser(opts);
                const csv = parser.parse(result);
                const csvFileName = path + "\\" + outputFileName;

                if (fs.existsSync(csvFileName)) return;

                fs.writeFile(csvFileName, csv, err => {
                    console.log(err);
                });

                //console.log(csv);
            } catch (err) {
                console.error(err);
            }
        } catch (e) {
            console.log('e', e);
        }
    });
}

/// RIS to javascript object
function risToJson(risFile) {
    return new Promise((resolve, reject) => {
        const articles = [];
        let articleIndex = -1;

        let jsonData = [];

        let currentArticle;

        risFile.on("line", function (line, lineCount, byteCount) { // 讀檔
            if (line === "" || line === "\r\n" || line === "\n" || articleIndex === -1) { // 空白行表示此文章結束
                articleIndex++;
                articles.push({});
                currentArticle = articles[articleIndex];
                return;
            }

            // 將欄位組織成Javascript物件
            var field = line.substr(0,2);
            if (articles[articleIndex][field] === undefined) {
                articles[articleIndex][field] = line.substr(6);
            } else if (Array.isArray(articles[articleIndex][field])) {     // 如果同一個欄位出現很多次就用改成陣列儲存
                articles[articleIndex][field].push(line.substr(6));
            } else {
                articles[articleIndex][field] = [
                    articles[articleIndex][field]
                ];
                articles[articleIndex][field].push(line.substr(6));
            }
        }).on('error', function(e) {
            console.log(e);
            reject(e);
        }).on('end', function () {
            articles.pop(); /// 最後一項是空的
            //console.log(articles);
            /// to CSV
            for (let i = 0; i < articles.length; i++) {
                jsonData[i] = {
                    "dc.contributor.author[zh_TW]": getAuthorsZhtw(articles[i]),
                    "dc.contributor.author[en_US]": getAuthorsEng(articles[i]),
                    "dc.title[zh_TW]": articles[i]["T1"],
                    "dc.title[en_US]": articles[i]["TT"],
                    "dc.date[zh_TW]": "",
                    "contents": "",
                    "dc.description.abstract[zh_TW]": getAbstractZhtw(articles[i]),
                    "dc.description.abstract[en_US]": getAbstractEng(articles[i]),
                    "dc.relation[zh_TW]": getRelation(articles[i]),
                    "dc.subject[zh_TW]": getKeywordsZhtw(articles[i]),
                    "dc.subject[en_US]": getKeywordsEng(articles[i]),
                    "dc.type[zh_TW]": "Journal Article",

                };
            }

            resolve(jsonData);
        });
    });
}

/**
 * 將名字中的英文名字部分取出，例如 engName("王曉明(Xiao Ming Wang)") => "Xiao Ming Wang"
 * @param {*} name
 */
function engName(name) {
    var engNameReg = /\((.*?)\)/;
    var m = name.match(engNameReg);
    if (m === null || m === undefined) return "";
    var s = m[0];
    if (s !== null && s !== undefined) {
        s = s.replace("(", "").replace(")", "");
        return s;
    }
    var engReg = /[a-zA-Z]/;
    if (name.search(engReg) === -1) {
        return "";
    } else {
        return name;
    }
}

/**
 * 將名字中的中文名字部分取出，例如 zhtwName("王曉明(Xiao Ming Wang)") => "王曉明"
 * @param {*} name
 */
function zhtwName(name) {
    var bracketI = name.search(/\(/);
    if (bracketI === -1) {
        var engReg = /[a-zA-Z]/;
        if (name.search(engReg) === -1) {
            return name;
        } else {
            return "";
        }
    } else {
        return name.substr(0, bracketI);
    }
}

/**
 * 取得所有作者的中文名字並以"||"串接
 * @param {*} article
 */
function getAuthorsZhtw(article) {
    var authors = article["AU"];
    var ret = "";
    if (Array.isArray(authors)) {
        for (var i = 0; i < authors.length; i++) {
            var name = zhtwName(authors[i]);
            if (name === "" || name === undefined)
                continue;
            ret += "||" + name;
        }
    } else {
        ret = zhtwName(authors);
    }
    if (ret.substr(0, 2) === "||")
        ret = ret.substr(2);
    return ret;
}

/**
 * 取得所有作者的英文名字並以"||"串接
 * @param {*} article
 */
function getAuthorsEng(article) {
    var authors = article["AU"];
    var ret = "";
    if (Array.isArray(authors)) {
        for (var i = 0; i < authors.length; i++) {
            var name = engName(authors[i]);
            if (name === "" || name === undefined)
                continue;
            ret += "||" + name;
        }
    } else {
        ret = engName(authors);
    }
    if (ret.substr(0, 2) === "||")
        ret = ret.substr(2);
    return ret;
}

/**
 * 取得中文摘要
 * @param {*} article
 */
function getAbstractZhtw(article) {
    var abs = article["AB"];
    if (abs === undefined) return "";
    if (Array.isArray(abs)) {
        return abs[0];
    } else {
        return abs;
    }
}

/**
 * 取得英文摘要
 * @param {*} article
 */
function getAbstractEng(article) {
    var abs = article["AB"];
    if (abs === undefined) return "";
    if (Array.isArray(abs)) {
        return abs[1];
    } else {
        return "";
    }
}

/**
 * 取得論文的citation
 * @param {*} article
 */
function getRelation(article) {
    var ret = "";
    if (article.JO !== undefined) {
        ret += article.JO;
    }
    if (article.VL !== undefined) {
        ret += ", Volume " + article.VL;
    }
    if (article.IS !== undefined) {
        ret += ", Issue " + article.IS;
    }
    if (article.SP !== undefined && article.EP !== undefined) {
        ret += ", Page(s) " + article.SP + "-" + article.EP;
    }
    return ret;
}

/**
 * 取得中文關鍵字並以"||"串接
 * @param {*} article
 */
function getKeywordsZhtw(article) {
    var kws = article.KW;
    var ret = "";
    if (Array.isArray(kws)) {
        for (var i = 0; i < kws.length / 2; i++) {
            ret += "||" + kws[i];
        }
        if (ret.substr(0, 2) === "||")
            ret = ret.substr(2);
        return ret;
    }
    if (kws === undefined)
        return "";
    return kws;
}

/**
 * 取得英文關鍵字並以"||"串接
 * @param {*} article
 */
function getKeywordsEng(article) {
    var kws = article.KW;
    var ret = "";
    if (Array.isArray(kws)) {
        for (var i = kws.length / 2; i < kws.length; i++) {
            ret += "||" + kws[i];
        }
        if (ret.substr(0, 2) === "||")
            ret = ret.substr(2);
        return ret;
    }
    if (kws === undefined)
        return "";
    return kws;
}
