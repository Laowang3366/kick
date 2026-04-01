import { createApp } from 'vue'
import './style.css'
import './styles/theme.css'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'highlight.js/styles/atom-one-dark.css'

const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(ElementPlus)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
