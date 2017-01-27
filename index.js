import h from 'h'
import setBoard from './src/setBoard'

document.head.appendChild(
  h('link', {rel: "stylesheet", href: "src/style.css"})
)
document.body.appendChild(
  h('div#board',
    h('button.hide#tick','tick')
  )
)
document.addEventListener('DOMContentLoaded', ()=>{
  setBoard('#board');
  document.querySelector('.clear').dispatchEvent(new Event('click'))
})
