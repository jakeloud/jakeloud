let conf

const setLoginData = (pwd, email) => {
  window.localStorage.setItem('pwd', pwd)
  window.localStorage.setItem('email', email)
}
const getLoginData = () => {
  password = window.localStorage.getItem('pwd')
  email = window.localStorage.getItem('email')
  return { password, email }
}
const api = async (op, obj = {}) =>
  await fetch('/api', {
    method: 'POST',
    body: JSON.stringify({op, ...getLoginData(), ...obj}),
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
  api('set-jakeloud-domain', body)
  window.replace(`https://${domain}`)
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
  await api('register', body)
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
    vcs: data.get('vcs'),
  }
  root.innerHTML = 'Creating app. Refresh to track progress in real time'
  await api('create-app', body)
  getConf()
  e.preventDefault()
}

handleUpdateJakeloud = async () => await api('update-jakeloud')

add = () => {
  const form = document.createElement('form')
  const pre = document.createElement('pre')
  pre.innerText = `Enter git vcs root in a format "<user>:<token>@<host>".
Enter github repo in a format "<user>/<repo>".`

  const submit = document.createElement('button')
  submit.innerText = 'create app'
  form.append(Field('name'), Field('domain'), Field('vcs'), Field('repo'), submit, pre)
  form.onsubmit = handleCreateApp
  root.innerHTML = ''
  root.append(form)
}

// https://www.therogerlab.com/sandbox/pages/how-to-create-and-download-a-file-in-javascript?s=0ea4985d74a189e8b7b547976e7192ae.7213739ce01001e16cc74602189bfa09
const createFileUrl = (content) => {
  const file = new File(["\ufeff"+content], '', {type: "text/plain:charset=UTF-8"});

  return window.URL.createObjectURL(file);
}

const App = (app) => {
  const el = document.createElement('pre')

  let buttonHTML = ''
  if (app.name === 'jakeloud') {
    buttonHTML = `<button onclick="handleUpdateJakeloud()">update jakeloud</button>`
  } else {
    buttonHTML = `<button onclick='api("create-app", ${JSON.stringify(app)})'>full reboot</button>`
  }
  el.innerHTML =
`<b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>
repo: ${app.repo}
owner: ${app.email}
<big>status: ${app.state}</big>
${buttonHTML}
`
  return el
}

const AppsTab = () => {
  const but = document.createElement('button')
  but.innerText = 'add app'
  but.onclick=add

  const downloadConf = document.createElement('a')
  downloadConf.download = 'conf.json'
  downloadConf.innerText = 'Download conf.json'
  downloadConf.href = createFileUrl(JSON.stringify(conf))

  root.innerHTML = ''
  root.append(but, downloadConf, ...conf.apps.map(App))
}

const getConf = async () => {
  const res = await api('get-conf')
  conf = await res.json()
  if (conf.message) {
    const form = document.createElement('form')
    const submit = document.createElement('button')
    switch (conf.message) {
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
  AppsTab()
}

onload=getConf()
