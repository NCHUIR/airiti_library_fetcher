# airiti_library_fetcher
華藝線上圖書館自動metadata轉換，從華藝書目匯出Ris格式轉換成DSpace的metadata

# 使用
選定期刊的特定卷、期，並在下圖的位置點選勾選框以全選所有文章，並點選書目匯出，選擇RIS格式後下載到電腦，
在本程式的ris資料夾中建立一個資料夾，名稱可以按照DSpaceImporter的格式命名，例如"全球政治評論第A期[99999]"，
並移動剛剛下載的ris到該資料夾中(即"全球政治評論第A期[99999]")。

![image](https://github.com/NCHUIR/airiti_library_fetcher/blob/master/img1.PNG)

此時的資料夾結構如下：

```
ris/
├── 全球政治評論第A期[99999]/
│   └── communityA.ris
└── 全球政治評論第B期[100000]/
    └── communityB.ris
```

下載多個ris之後可以在本程式資料夾中執行指令
```
npm run start
```

完成之後資料夾結構如下：

```
ris/
├── 全球政治評論第A期[99999]/
│   ├── metadata.csv
│   └── communityA.ris
└── 全球政治評論第B期[100000]/
    ├── metadata.csv
    └── communityB.ris
```

您可以修改metadata的內容，其中content, dc.date[zh_TW]欄位會是空白的，需要手動增添。

PDF檔需手動下載，暫時沒有自動化的解決方案。

# 已知問題
有時中英文欄位內容會顛倒，subject欄位(關鍵字)可能會缺漏。
