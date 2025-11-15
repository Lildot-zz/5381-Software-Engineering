1.首先在Github上下载集成好的Superset文件。
2.然后打开本地的Docker，解压后在终端切换至superset文件夹下，输入指令docker compose -f docker-compose-non-dev.yml up 初始化docker及运行superset。
Tips：如果启动失败遇到缺少.env文件的时候，在官方文档https://github.com/apache/superset/blob/master/docker/.env，直接导入.env文件运行上述指令。
3.启动成功后，在docker-fronted文件夹下运行指令 npm i下载相关依赖项。
Tips：可能会遇到NPM 依赖版本冲突 + NPM v7+ 严格的 peer dependency（对等依赖）校验机制，导致安装失败。 这时候需要在同一文件夹下，运行指令npm cache clean —force 来强制清理npm缓存。然后运行指令npm install --legacy-peer-deps 来安装依赖。 4.还是在docker-fronted文件下运行npm run storybook打开storybook文件。
