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
  await fetch('https://jakeloud.yam.pw/api', {
    mode: 'no-cors',
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

const Form = (onSubmit, submitText, ...fields) => {
  const form = document.createElement('form')
  const submit = document.createElement('button')
  submit.innerText = submitText
  form.onsubmit = onSubmit
  form.append(...fields)
  form.append(submit)
  return form
}

const formDataToJSON = (formData) => formData.reduce((object, value, key) => object[key] = value, {})

const handleJakeloudDomain = (e) => {
  e.preventDefault()
  const data = new FormData(e.target)
  api('set-jakeloud-domain', formDataToJSON(data))
  window.replace(`https://${domain}`)
}
const handleRegister = async (e) => {
  e.preventDefault()
  const data = new FormData(e.target)
  setLoginData(data.get('password'), data.get('email'))
  root.innerHTML = 'Registering...'
  await api('register', formDataToJSON(data))
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
  root.innerHTML = 'Creating app. Refresh to track progress in real time'
  await api('create-app', formDataToJSON(data))
  getConf()
  e.preventDefault()
}

handleUpdateJakeloud = async () => await api('update-jakeloud')

add = () => {
  const pre = document.createElement('pre')
  pre.innerText = `Enter git vcs root in a format "<user>:<token>@<host>".
Enter github repo in a format "<user>/<repo>".`
  root.innerHTML = ''
  root.append(Form(handleCreateApp, 'create app', Field('name'), Field('domain'), Field('vcs'), Field('repo'), pre))
}

// https://www.therogerlab.com/sandbox/pages/how-to-create-and-download-a-file-in-javascript?s=0ea4985d74a189e8b7b547976e7192ae.7213739ce01001e16cc74602189bfa09
const createFileUrl = (content) => {
  const file = new File(["\ufeff"+content], '', {type: "text/plain:charset=UTF-8"});

  return window.URL.createObjectURL(file);
}

const handleRegisterAllowed = (registerAllowed) => {
  api('set-jakeloud-additional', {additional: {registerAllowed}})
}

const App = (app) => {
  // TODO: add on-premise dev server
  const el = document.createElement('pre')
  const additional = app.additional ?? {}

  let additionalHTML = ''
  if (app.name === 'jakeloud') {
    const updateJakeloudButton = `<button onclick="handleUpdateJakeloud()">update jakeloud</button>`
    const registrationCheckbox = `<label for="a">Registration allowed
  <input id="a" ${additional.registerAllowed === true ? 'checked' : ''} type="checkbox" onclick="handleRegisterAllowed(event.target.checked)"/>
</label>`
    additionalHTML = `${updateJakeloudButton}${registrationCheckbox}`
  } else {
    const rebootApp = `<button onclick='api("create-app", ${JSON.stringify(app)})'>full reboot</button>`
    const deleteApp = `<button onclick='api("delete-app", ${JSON.stringify(app)})'>delete</button>`
    additionalHTML = `${rebootApp}${deleteApp}`
  }
  el.innerHTML =
`<b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>
repo: ${app.repo}
owner: ${app.email}
<big>status: ${app.state}</big>
${additionalHTML}
`
  return el
}

const AppsTab = () => {
  const addApp = document.createElement('button')
  addApp.innerText = 'add app'
  addApp.onclick=add

  const logout = document.createElement('button')
  logout.innerText = 'logout'
  logout.onclick = setLoginData.bind(null, [null, null])

  const downloadConf = document.createElement('a')
  downloadConf.download = 'conf.json'
  downloadConf.innerText = 'Download conf.json'
  downloadConf.href = createFileUrl(JSON.stringify(conf))

  root.innerHTML = ''
  root.append(addApp, logout, downloadConf, ...conf.apps.map(App))
}

const confHandler = {
  domain: () => {
    root.innerHTML = ''
    root.append(Form(handleJakeloudDomain, 'assign domain', Field('email'), Field('domain')))
  },
  login: () => {
    root.innerHTML = ''
    root.append(
      Form(handleLogin, 'login', Field('email'), Field('password')),
      Form(handleRegister, 'register', Field('email'), Field('password'))
    )
  },
  register: () => {
    root.innerHTML = ''
    root.append(Form(handleRegister, 'register', Field('email'), Field('password'), submit))
  }
}

const getConf = async () => {
  const res = await api('get-conf')
  conf = await res.json()
  if (conf.message) {
    confHandler[conf.message]()
  } else{
    AppsTab()
  }
}

onload=getConf()
