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

const setVCSData = (vcs) => window.localStorage.setItem('vcs', JSON.stringify(vcs))

const getVCSData = () => {
  try {
    return JSON.parse(window.localStorage.getItem('vcs')) || []
  } catch (e) {
    return []
  }
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
  form.append(...fields, Button(submitText))
  return form
}

const formDataToJSON = (formData) => {
  const object = {}
  formData.forEach((value, key) => object[key] = value)
  return object
}

const handleJakeloudDomain = (e) => {
  const data = new FormData(e.target)
  e.preventDefault()
  api('setJakeloudDomainOp', formDataToJSON(data))
  location.replace(`https://${data.get('domain')}`)
}
const handleRegister = async (e) => {
  const data = new FormData(e.target)
  e.preventDefault()
  setLoginData(data.get('password'), data.get('email'))
  root.innerHTML = 'Registering...'
  await api('registerOp', formDataToJSON(data))
  getConf()
}
const handleLogin = (e) => {
  const data = new FormData(e.target)
  e.preventDefault()
  setLoginData(data.get('password'), data.get('email'))
  getConf()
}
const handleCreateApp = async (e) => {
  const data = new FormData(e.target)
  e.preventDefault()
  root.innerHTML = 'Creating app. Refresh to track progress in real time'
  await api('createAppOp', formDataToJSON(data))
  getConf()
}

const handleCreateOnPremise = (prefilledData) => async (e) => {
  const data = new FormData(e.target)
  e.preventDefault()
  root.innerHTML = 'Creating on premise. Refresh to track progress in real time'
  await api('createOnPremiseOp', {...prefilledData, ...formDataToJSON(data)})
  getConf()
}

handleUpdateJakeloud = async () => await api('updateJakeloudOp')

add = (options = {}) => {
  const vcses = getVCSData()
  const vcsField = document.createElement('div')
  const vcsSelect = document.createElement('select')
  const label = document.createElement('label')
  vcsSelect.id = 'vcs'
  vcsSelect.name = 'vcs'
  vcsSelect.append(
    ...vcses.map(vcs => {
      const option = document.createElement('option')
      option.value = `${vcs.user}:${vcs.token}@${vcs.host}`
      option.innerText = `${vcs.user}@${vcs.host}`
      return option
    })
  )
  label.for = 'vcs'
  label.innerText = 'vcs'
  vcsField.append(label, vcsSelect)

  root.innerHTML = ''
  if (options.onPremise) {
    const p = document.createElement('p')
    p.innerText = `Example docker options: "-v /home/jakeloud:/home/jakeloud -e PASSWORD=jakeloud"`
    const { vcs, repo } = options
    root.append(Form(handleCreateOnPremise({vcs, repo}), 'create on premise', Field('name'), Field('domain'), Field('docker options'), p))
  } else {
    const p = document.createElement('p')
    p.innerText = `Enter github repo in a format "<user|org>/<repo>". Example docker options: "-v /home/jakeloud:/home/jakeloud -e PASSWORD=jakeloud"`
    root.append(Form(handleCreateApp, 'create app', Field('name'), Field('domain'), vcsField, Field('repo'), Field('docker options'), p))
  }
}

// https://www.therogerlab.com/sandbox/pages/how-to-create-and-download-a-file-in-javascript?s=0ea4985d74a189e8b7b547976e7192ae.7213739ce01001e16cc74602189bfa09
const createFileUrl = (content) => {
  const file = new File(["\ufeff"+content], '', {type: "text/plain:charset=UTF-8"});

  return window.URL.createObjectURL(file);
}

const handleRegisterAllowed = (registerAllowed) => {
  api('setJakeloudAdditionalOp', {additional: {registerAllowed}})
}

const App = (app) => {
  const additional = app.additional ?? {}
  const vcses = getVCSData()
  const vcs = vcses.find(vcs => app.vcs === `${vcs.user}@${vcs.host}` || app.vcs === vcs.host)
  app.vcs = vcs ? `${vcs.user}:${vcs.token}@${vcs.host}` : null

  const wrapper = document.createElement('div')
  const info = document.createElement('pre')
  info.innerHTML = `
<b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>${app.sshPort ? ` ssh port:${app.sshPort}` : ''}
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
    
    const downloadConf = document.createElement('a')
    downloadConf.download = 'conf.json'
    downloadConf.innerText = 'Download conf.json'
    downloadConf.href = createFileUrl(JSON.stringify(conf))

    wrapper.append(Button('update jakeloud', handleUpdateJakeloud), registrationCheckbox, downloadConf)
  } else {
    if (app.vcs) {
      wrapper.append(Button('full reboot', () => api('createAppOp', app)))
      wrapper.append(
        Button('delete app', () => api('deleteAppOp', app)),
      )
      if (additional.supportsOnPremise) {
        wrapper.append(Button('on-premise dev server', () => add({onPremise: true, vcs: app.vcs, repo: app.repo})))
      }
    }
  }
  return wrapper
}

let Header

const SettingsTab = () => {
  const jakeloudApp = conf.apps.find(app => app.name === 'jakeloud')
  const vcses = getVCSData()
  
  root.innerHTML = ''
  root.append(
    Header(),
    Button('logout', setLoginData.bind(null, [null, null])),
    App(jakeloudApp), 
    Form(
      (e) => {
        const data = new FormData(e.target)
        e.preventDefault()
        setVCSData(vcses.concat([formDataToJSON(data)]))
        VCSTab()
      },
      'add vcs',
      Field('user'),
      Field('token'),
      Field('host')
    ),
    ...vcses.map((vcs, j) => {
      const wrapper = document.createElement('div')
      const info = document.createElement('pre')
      info.innerHTML = `${vcs.user}@${vcs.host}`
      wrapper.append(
        document.createElement('hr'),
        info,
        Button('delete vcs', () => {
          setVCSData(vcses.filter((_, i) => i !== j))
          VCSTab()
        }),
      )
      return wrapper
    })
  )
}

const AppsTab = () => {
  root.innerHTML = ''
  root.append(
    Header(),
    Button('add app', add),
    ...conf.apps.filter(app => app.name !== 'jakeloud').map(App)
  )
}

Header = () => {
  const nav = document.createElement('nav')
  nav.append(
    Button('apps', AppsTab),
    Button('settings', SettingsTab),
    document.createElement('hr'),
  )
  return nav
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
    root.append(Form(handleRegister, 'register', Field('email'), Field('password')))
  }
}

const getConf = async () => {
  const res = await api('getConfOp')
  conf = await res.json()
  if (conf.message) {
    confHandler[conf.message]()
  } else{
    AppsTab()
  }
}

onload=getConf()
