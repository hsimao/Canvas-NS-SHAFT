// == 環境變數
const updateFPS = 30 // 每秒執行30次, 控制update的setInterval, (1000/updateFPS)
const showMouse = true
const bgColor = 'black'
let time = 0

// == 控制介面
const controls = {
  value: 0,
}
const gui = new dat.GUI()
gui
  .add(controls, 'value', -2, 2)
  .step(0.01)
  .onChange(function(value) {})

// == canvas初始化
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

// 快速繪製圓形方法 => ctx.circal(向量座標, 半徑)
ctx.circle = function(v, r) {
  this.arc(v.x, v.y, r, 0, Math.PI * 2)
}

//快速繪製線條方法 => ctx.line(起始點座標, 結束點座標)
ctx.line = function(v1, v2) {
  this.moveTo(v1.x, v1.y)
  this.lineTo(v2.x, v2.y)
}

function initCanvas() {
  ww = canvas.width = window.innerWidth //將視窗寬度給canvas寬度 以及 ww 變數
  wh = canvas.height = window.innerHeight
}
initCanvas()

// == 邏輯初始化
let game
function init() {
  game = new Game()
  game.init()
}

// == 更新畫面邏輯
function update() {
  time++ //每秒會累加30

  if (game.playing) {
    game.update()
  }
}

// == 畫面更新
function draw() {
  //清空背景
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ww, wh)

  // == 在這裡開始繪製
  game.draw()

  // 滑鼠
  ctx.fillStyle = 'red'
  ctx.beginPath()
  ctx.circle(mousePos, 3)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.translate(mousePos.x, mousePos.y)
  ctx.strokeStyle = 'red'
  let len = 20
  ctx.line(new Vec2(-len, 0), new Vec2(len, 0))
  ctx.fillText(mousePos, 10, -10)
  ctx.rotate(Math.PI / 2)
  ctx.line(new Vec2(-len, 0), new Vec2(len, 0))
  ctx.stroke()
  ctx.restore()
  // == 繪製End ==

  requestAnimationFrame(draw) //預定下一次執行
}

// == canvas 頁面載入執行順序控制
function loaded() {
  initCanvas()
  init()
  requestAnimationFrame(draw) //繪製畫面用-盡可能地快速執行
  setInterval(update, 1000 / updateFPS) //更新畫面邏輯用Interval
}
window.addEventListener('load', loaded)
window.addEventListener('resize', initCanvas) //重新設置寬、高

// == 向量物件 Vec2 ==
class Vec2 {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  set(x, y) {
    this.x = x
    this.y = y
  }

  move(x, y) {
    this.x += x
    this.y += y
  }

  add(v) {
    return new Vec2(this.x + v.x, this.y + v.y)
  }

  sub(v) {
    return new Vec2(this.x - v.x, this.y - v.y)
  }

  mul(s) {
    return new Vec2(this.x * s, this.y * s)
  }

  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  set length(nv) {
    let temp = this.unit.mul(nv)
    this.set(temp.x, temp.y)
  }

  clone() {
    return new Vec2(this.x, this.y)
  }

  toString() {
    return `(${this.x}, ${this.y})`
  }

  equal(v) {
    return this.x == v.x && this.y == v.y
  }

  get angle() {
    return Math.atan2(this.y, this.x)
  }

  get unit() {
    return this.mul(1 / this.length)
  }
}
// == 向量物件End ==

// == 遊戲物件 ==
class Game {
  constructor() {
    this.player = null
    this.walls = []
    this.width = 700
    this.height = wh
    this.walltypes = ['normal', 'jump', 'slideLeft', 'slideRight', 'hurt', 'fade']
    this.hurt = 0
    this.playing = false
    this.keystatus = {
      left: false,
      right: false,
    }
    this.time = 0 // 左上角的階梯數
  }

  init() {
    // 清空階梯, 重新產生新階梯物件
    this.walls = []
    for (let i = 0; i < wh / 150; i++) {
      this.walls.push(
        new Wall({
          p: new Vec2(Math.random() * this.width, i * 150 + 100),
          type: this.walltypes[parseInt(Math.random() * this.walltypes.length)],
        })
      )
    }

    this.player = new Player({
      p: new Vec2(this.width / 2, 200),
    })
  }

  update() {
    this.player.update()

    // 處理左右鍵控制角色位置
    if (this.keystatus.left) {
      this.player.p.x -= 8
    }

    if (this.keystatus.right) {
      this.player.p.x += 8
    }

    // 每格 20 重新創建一個階梯
    if (time % 20 === 0) {
      this.walls.push(
        new Wall({
          p: new Vec2(Math.random() * this.width, this.height),
          type: this.walltypes[parseInt(Math.random() * this.walltypes.length)],
        })
      )
    }

    // 判斷玩家是否接觸到階梯
    let touching = false
    this.walls.forEach(wall => {
      wall.update()

      if (
        // 左邊邊界判斷
        wall.p.x - wall.width / 2 < this.player.p.x + this.player.width / 2 &&
        // 右邊邊界判斷
        wall.p.x + wall.width / 2 > this.player.p.x - this.player.width / 2
      ) {
        // 判斷 x 軸
        if (this.player.p.y > wall.p.y && this.player.p.y < wall.p.y + wall.height + 10) {
          // 接觸到時將玩家丟入階梯 step 方法處理
          touching = true
          wall.step(this.player)
          // 將當下踩到的階梯儲存, 便於後續判斷扣血時只扣一次
          this.player.lastBlock = wall
        }
      }
    })

    if (!touching) {
      this.player.lastBlock = null
    }

    // 碰到上方邊界, 彈跳起來並扣血量
    if (this.player.p.y - this.player.height < 0) {
      // hurt 為緩衝效果
      if (this.hurt === 0) {
        this.player.bloodDelta(-4)
        this.player.v.y = 2
        this.player.p.y = 10
        this.hurt = 1
        TweenMax.to(this, 0.5, { hurt: 0 })
      }
    }

    // 判斷玩家是否超出左右邊界
    // 左邊界
    if (this.player.p.x - this.player.width / 2 < 0) {
      this.player.p.x = 0 + this.player.width / 2
    }
    // 右邊界
    if (this.player.p.x + this.player.width / 2 > this.width) {
      this.player.p.x = this.width - this.player.width / 2
    }

    // 玩家掉落最底部範圍，遊戲結束
    if (this.player.p.y > wh + this.player.height) {
      game.end()
    }

    // 過濾掉已經超過畫面的階梯
    this.walls = this.walls.filter(wall => wall.active)
  }

  draw() {
    ctx.save()

    ctx.translate(ww / 2 - this.width / 2, 0)

    this.player.draw()
    this.walls.forEach(wall => wall.draw())

    // 邊界
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, wh)
    ctx.moveTo(this.width, 0)
    ctx.lineTo(this.width, wh)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.stroke()

    ctx.restore()

    // 扣血紅畫面
    ctx.fillStyle = `rgba(255, 0, 0, ${this.hurt})`
    ctx.fillRect(0, 0, ww, wh)

    this.player.drawBlood()
  }

  start() {
    $('button').hide()
    this.init()
    this.playing = true
    this.time = 0
  }

  end() {
    $('button').show()
    this.playing = false
  }
}
// == 遊戲物件 End ==

// == 玩家物件 ==
class Player {
  constructor(args) {
    let def = {
      p: new Vec2(0, 0),
      v: new Vec2(0, 0),
      a: new Vec2(0, 0.8),
      width: 40,
      height: 55,
      blood: 10,
      maxBlood: 10,
      lastBlock: null,
    }
    Object.assign(def, args)
    Object.assign(this, def)
  }

  update() {
    this.p = this.p.add(this.v)
    this.v = this.v.add(this.a)
  }

  draw() {
    ctx.fillStyle = '#eee'
    // 玩家從上方中間開始繪製
    ctx.fillRect(this.p.x - this.width / 2, this.p.y - this.height, this.width, this.height)
  }

  // 繪製血量
  drawBlood() {
    for (let i = 0; i < this.maxBlood; i++) {
      ctx.fillStyle = i < this.blood ? 'red' : 'rgba(255, 255, 255, 0.2)'
      ctx.fillRect(30 + i * 15 + (i - 1) * 4, 30, 10, 30)
    }
  }

  bloodDelta(delta) {
    this.blood += delta
    if (this.blood > this.maxBlood) {
      this.blood = this.maxBlood
    }

    if (this.blood < 0) {
      this.blood = 0
      // 遊戲結束
      game.end()
    }
  }
}
// == 玩家物件 End ==

// == 階梯物件 ==
class Wall {
  constructor(args) {
    let def = {
      p: new Vec2(0, 0),
      v: new Vec2(0, -4), // 速度
      a: new Vec2(0, 0), // 加速度
      width: 150,
      height: 20,
      extraHeight: 0,
      type: 'normal',
      active: true,
    }

    Object.assign(def, args)
    Object.assign(this, def)
  }

  update() {
    this.p = this.p.add(this.v)
    this.v = this.v.add(this.a)

    // 超出螢幕, 將 active 改成 false, 後續清除該物件
    if (this.p.y < -20) {
      this.active = false
    }
  }

  draw() {
    ctx.save()
    // 定位, 將中心座標移動到左上角
    ctx.translate(this.p.x - this.width / 2, this.p.y - this.extraHeight)

    // 畫出階梯
    ctx.fillStyle = '#888'
    ctx.font = '20px Ariel'
    ctx.fillText(this.type, 0, 30)

    if (this.type === 'normal' || this.type === 'hurt') {
      ctx.fillRect(0, 0, this.width, this.height / 2)
    }

    // 繪製慢慢往下掉階梯
    if (this.type === 'fade') {
      ctx.fillStyle = '#ffd428'
      ctx.fillRect(0, 0, this.width, this.height)
    }

    // 繪製傷害刺刺三角形
    if (this.type === 'hurt') {
      // 算出寬度
      let span = this.width / 16
      ctx.beginPath()
      for (let i = 0; i <= this.width / span; i++) {
        ctx.lineTo(i * span, -(i % 2) * 15)
      }
      ctx.fillStyle = '#ddd'
      ctx.fill()
    }

    // 繪製跳跳板
    if (this.type === 'jump') {
      ctx.fillStyle = '#53d337'
      ctx.fillRect(0, 0, this.width, 5)
      ctx.fillRect(0, this.height + this.extraHeight, this.width, 5)
    }

    // 繪製左右移動階梯
    if (this.type === 'slideLeft' || this.type === 'slideRight') {
      for (let i = 0; i < this.width / 20; i++) {
        let width = 10

        // 動態移動的 x 軸
        let x = i * 20 + (time % 20) * (this.type === 'slideLeft' ? -1 : 1)

        // 產生固定在左側的矩形
        if (x < 0) {
          x = 0
        }

        // 移動 x 軸加上矩形本身寬度, 超出階梯範圍
        if (x + width > this.width) {
          // 移動的 x 軸超出階梯寬度的話寬度就變 0, 否則寬度慢慢縮小
          width = this.width - x < 0 ? 0 : this.width - x
        }
        ctx.fillStyle = 'red'
        ctx.save()
        ctx.transform(1, 0, 0.5, 1, 0, 0)
        ctx.fillRect(x, 0, width, this.height)
        ctx.restore()
      }
    }

    ctx.restore()
  }

  step(player) {
    player.v.y = 0 // 加速度歸 0

    if (this.type !== 'fade') {
      player.p.y = this.p.y // 站在階梯上
    }

    // 加血量
    if (player.lastBlock !== this) {
      player.bloodDelta(1)
    }

    // 扣血量
    if (this.type === 'hurt') {
      if (player.lastBlock !== this) {
        player.bloodDelta(-5)

        game.hurt = 1
        TweenMax.to(game, 0.5, { hurt: 0 })
      }
    }

    // 慢慢往下掉
    if (this.type === 'fade') {
      player.p.y -= 3
    }

    // 跳躍
    if (this.type === 'jump') {
      player.v.y = -15
      this.extraHeight = 10 // 跳跳板往上彈
      TweenMax.to(this, 0.2, {
        extraHeight: 0,
      })
    }

    // 往左移動
    if (this.type === 'slideLeft') {
      player.p.x -= 3
    }

    // 往右移動
    if (this.type === 'slideRight') {
      player.p.x += 3
    }
  }
}
// == 階梯物件 End ==

// == 滑鼠事件 ==
let mousePos = new Vec2(0, 0) //滑鼠移動時的向量座標
let mousePosDown = new Vec2(0, 0) //滑鼠按下時的向量座標
let mousePosUp = new Vec2(0, 0) //滑鼠放開時的向量座標

window.addEventListener('mousemove', mousemove)
window.addEventListener('mouseup', mouseup)
window.addEventListener('mousedown', mousedown)

function mousemove(e) {
  mousePos.set(e.x, e.y)
}

function mouseup(e) {
  mousePos.set(e.x, e.y)
  mousePosUp = mousePos.clone()
}

function mousedown(e) {
  mousePos.set(e.x, e.y)
  mousePosDown = mousePos.clone()
}
// ==滑鼠事件End ==

// 按下鍵盤鍵時將對應 status 改為 true
window.addEventListener('keydown', evt => {
  let key = evt.key.replace('Arrow', '').toLowerCase()
  game.keystatus[key] = true
  console.log(game.keystatus)
})

// 鍵盤放開時將 status 改為 false
window.addEventListener('keyup', evt => {
  let key = evt.key.replace('Arrow', '').toLowerCase()
  game.keystatus[key] = false
  console.log(game.keystatus)
})
