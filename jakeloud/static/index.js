const setLoginData = (pwd, email) => {
  window.localStorage.setItem('pwd', pwd)
  window.localStorage.setItem('email', email)
}
const getLoginData = () => {
  password = window.localStorage.getItem('pwd')
  email = window.localStorage.getItem('email')
  return { password, email }
}
const post = async (url, obj = {}) =>
  await fetch(url, {
    method: 'POST',
    body: JSON.stringify({...getLoginData(), ...obj}),
  })

const Field = (name) => {
  const input = document.createElement('input')
  const label = document.createElement('label')
  input.id = name
  input.name = name
  label.for = name
  label.innerText = name
  label.append(input)
  return label
}

const handleJakeloudDomain = (e) => {
  e.preventDefault()
  const data = new FormData(e.target)
  const body = {
    email: data.get('email'),
    domain: data.get('domain'),
  }
  root.innerHTML = 'Setting up domain. Update to see changes.'
  post('/set-jakeloud-domain', body)
}
const handleRegister = async (e) => {
  e.preventDefault()
  const data = new FormData(e.target)
  setLoginData(data.get('password'), data.get('email'))
  const body = {
    email: data.get('email'),
    password: data.get('password'),
  }
  root.innerHTML = 'Registering...'
  await post('/register', body)
  getConf()
}
const handleLogin = (e) => {
  const data = new FormData(e.target)
  setLoginData(data.get('password'), data.get('email'))
  getConf()
  e.preventDefault()
}
const handleCreateApp = async (e) => {
  const data = new FormData(e.target)
  const body = {
    domain: data.get('domain'),
    name: data.get('name'),
    repo: data.get('repo'),
  }
  root.innerHTML = 'Creating app. Refresh to track progress in real time'
  await post('/create-app', body)
  getConf()
  e.preventDefault()
}

add = () => {
  const form = document.createElement('form')
  const p = document.createElement('p')
  p.innerText = 'Enter github repo in a format <user>/<repo>. This repo must be public.'

  const submit = document.createElement('button')
  submit.innerText = 'create app'
  form.append(Field('name'), Field('domain'), Field('repo'), submit, p)
  form.onsubmit = handleCreateApp
  root.innerHTML = ''
  root.append(form)
}

const App = (app) => {
  const el = document.createElement('pre')
  el.innerText = JSON.stringify(app)
  el.innerHTML =
`<b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>
repo: ${app.repo}
owner: ${app.email}
<big>status: ${app.state}</big>
<button onclick='post("/create-app", ${JSON.stringify(app)})'>full reboot</button>
`
  return el
}

const getConf = async () => {
  const res = await post('/get-conf')
  const json = await res.json()
  if (json.message) {
    const form = document.createElement('form')
    const submit = document.createElement('button')
    switch (json.message) {
      case 'domain':
        submit.innerText = 'assign domain'
        form.append(Field('email'), Field('domain'), submit)
        form.onsubmit = handleJakeloudDomain
        break
      case 'register':
        submit.innerText = 'register'
        form.append(Field('email'), Field('password'), submit)
        form.onsubmit = handleRegister
        break
      case 'login':
        submit.innerText = 'login'
        form.append(Field('email'), Field('password'), submit)
        form.onsubmit = handleLogin
        break
    }
    root.innerHTML = ''
    root.append(form)
    return
  }
  const but = document.createElement('button')
  but.innerText = 'add app'
  but.onclick=add
  root.append(but, ...json.apps.map(App))
}

onload=getConf()
