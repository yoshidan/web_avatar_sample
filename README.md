# WEBでアバターになってチャットするサンプル

* 1:1通信のみ対応
* Chromeのみ対応

<img src='./image/demo.gif' width='480px' />

## backend
```
cd server
docker-compose up
```

* localhost:8000でWebSocketサーバが起動します。
* チャットする時に必要です。

## frontend
```
yarn 
yarn start
```

* localhost:4001で画面確認できます。

