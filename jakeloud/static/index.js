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

/**
 * Sends a request to the API endpoint.
 *
 * @param {string} op - The operation to perform.
 * @param {Object} body - The request body.
 * @return {Promise<Response>}
 */
const api = async (op, body = {}) =>
  await fetch('/api', {
    method: 'POST',
    body: JSON.stringify({op, ...getLoginData(), ...body}),
  })

/**
 * Button component
 * 
 * @param {string} text
 * @param {function} onClick
 * @returns {HTMLButtonElement}
 */
const Button = (text, onClick) => {
  const button = document.createElement('button')
  button.innerText = text
  button.onclick = onClick
  return button
}

/**
 * Creates a Field element with a label and an input.
 *
 * @param {string} name
 * @param {string} [type='text']
 * @returns {HTMLDivElement}
 */
const Field = (name, type='text') => {
  const field = document.createElement('div')
  const input = document.createElement('input')
  const label = document.createElement('label')
  input.id = name
  input.type = type
  input.name = name
  label.for = name
  label.innerText = name
  field.append(label, input)
  return field
}

/**
 * Creates a form element with the given onSubmit function, submitText, and fields.
 *
 * @param {function} onSubmit
 * @param {string} submitText
 * @param {...HTMLElement} fields
 * @return {HTMLFormElement}
 */
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
  const p = document.createElement('p')
  p.innerText = `Enter github repo in a format "<user|org>/<repo>". Example docker options: "-v /home/jakeloud:/home/jakeloud -e PASSWORD=jakeloud"`
  root.append(Form(handleCreateApp, 'create app', Field('name'), Field('domain'), vcsField, Field('repo'), Field('docker options'), p))
}

const handleRegisterAllowed = (registerAllowed) => {
  api('setJakeloudAdditionalOp', {additional: {registerAllowed}})
}

const App = (app) => {
  const additional = app.additional ?? {}
  const vcses = getVCSData()
  const vcs = vcses.find(vcs => app.vcs === `${vcs.user}@${vcs.host}` || app.vcs === vcs.host)
  const displayVcs = vcs ? `${vcs.user}:${vcs.token}@${vcs.host}` : null

  const wrapper = document.createElement('div')
  const info = document.createElement('pre')
  info.innerHTML = `
<a href="#${app.name}">&nwarr;</a><b>${app.name}</b> - <a href="https://${app.domain}">${app.domain}</a>
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
    if (displayVcs) {
      wrapper.append(Button('full reboot', () => api('createAppOp', {...app, vcs: displayVcs})))
      wrapper.append(
        Button('delete app', () => api('deleteAppOp', {...app, vcs: displayVcs})),
      )
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
  const apps = conf.apps.filter(app => {
    const hash = window.location.hash
    const isDetailedInfo = hash !== '' ? hash === `#${app.name}` : true
    return app.name !== 'jakeloud' && isDetailedInfo
  }).map(App)
  root.append(
    Header(),
    Button('add app', add),
    ...apps,
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
    root.append(Form(handleJakeloudDomain, 'assign domain', Field('email', 'email'), Field('domain')))
  },
  login: () => {
    root.innerHTML = ''
    root.append(
      Form(handleLogin, 'login', Field('email', 'email'), Field('password', 'password')),
      Form(handleRegister, 'register', Field('email', 'email'), Field('password', 'password'))
    )
  },
  register: () => {
    root.innerHTML = ''
    root.append(Form(handleRegister, 'register', Field('email', 'email'), Field('password', 'password')))
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
