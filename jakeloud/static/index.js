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
    mode: 'no-cors',
    method: 'POST',
    body: JSON.stringify({op, ...getLoginData(), ...obj}),
  })

const Button = (text, onClick) => {
  const button = document.createElement('button')
  button.innerText = text
  button.onclick = onClick
  return button
}

const Field = (name) => {
  const field = document.createElement('div')
  const input = document.createElement('input')
  const label = document.createElement('label')
  input.id = name
  input.name = name
  label.for = name
  label.innerText = name
  field.append(label, input)
  return field
}

const Form = (onSubmit, submitText, ...fields) => {
  const form = document.createElement('form')
  form.onsubmit = onSubmit
  form.append(...fields, Button(submitText, onSubmit))
  return form
}

const formDataToJSON = (formData) => {
  const object = {}
  formData.forEach((value, key) => object[key] = value)
  return object
}

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
  const p = document.createElement('p')
  p.innerText = `Enter git vcs root in a format "<user>:<token>@<host>".
Enter github repo in a format "<user>/<repo>".`
  root.innerHTML = ''
  root.append(Form(handleCreateApp, 'create app', Field('name'), Field('domain'), Field('vcs'), Field('repo'), p))
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
  const additional = app.additional ?? {}

  const wrapper = document.createElement('div')
  const info = document.createElement('pre')
  info.innerHTML = `
<b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>
repo: ${app.repo}
owner: ${app.email}
<big>status: ${app.state}</big>`
  wrapper.append(document.createElement('hr'), info)

  if (app.name === 'jakeloud') {
    const registrationCheckbox = document.createElement('div')
    registrationCheckbox.innerHTML = `
      <input id="a" ${additional.registerAllowed === true ? 'checked' : ''} type="checkbox" onclick="handleRegisterAllowed(event.target.checked)"/>
      <label for="a">
      Registration allowed
      </label>`

    wrapper.append(Button('update jakeloud', handleUpdateJakeloud), registrationCheckbox)
  } else {
    wrapper.append(
      Button('full reboot', () => api('create-app', app)),
      Button('delete app', () => api('delete-app', app)),
    )
  }
  return wrapper
}

const AppsTab = () => {
  const downloadConf = document.createElement('a')
  downloadConf.download = 'conf.json'
  downloadConf.innerText = 'Download conf.json'
  downloadConf.href = createFileUrl(JSON.stringify(conf))

  root.innerHTML = ''
  root.append(
    Button('add app', add),
    Button('logout', setLoginData.bind(null, [null, null])),
    downloadConf,
    ...conf.apps.map(App)
  )
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
