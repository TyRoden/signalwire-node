require('dotenv').config()
const inquirer = require('inquirer')
const sw = require('../..')

const host = process.env.SIGNALWIRE_API_HOSTNAME
const project = process.env.SIGNALWIRE_API_PROJECT
const token = process.env.SIGNALWIRE_API_TOKEN
const FROM_NUMBER = process.env.DEFAULT_FROM_NUMBER

console.log('Init client with: ', host, project, token, '\n')
const client = new sw.SignalWire({ host, project, token })

client.on('signalwire.error', error => {
  console.error('SW Client error,', error)
})

client.on('signalwire.ready', session => {
  console.log('SW Client ready! \n')
  _init()
})

client.connect()

async function makeCall(to) {
  const leg = await client.calling.makeCall(FROM_NUMBER, to)
  leg.on('created', call => {
    console.log(`\t ${call.id} state from ${call.prevState} to ${call.state}`, '\n')
  })
  .on('ringing', call => {
    console.log(`\t ${call.id} state from ${call.prevState} to ${call.state}`, '\n')
  })
  .on('answered', call => {
    console.log(`\t ${call.id} state from ${call.prevState} to ${call.state}`, '\n')
  })
  .on('ending', call => {
    console.log(`\t ${call.id} state from ${call.prevState} to ${call.state}`, '\n')
  })
  .on('ended', call => {
    console.log(`\t ${call.id} state from ${call.prevState} to ${call.state}`, '\n')
    _init()
  })
  // .begin()

  return leg
}

function _init() {
  const choices = [
    'Test a single call',
    'Make a call and then "call.connect"',
    'Make a call and play TTS',
    'Register a listener for inbound calls',
    { name: 'Send a message', disabled: 'not ready yet :) ' },
    'Just Exit'
  ]
  const exitChoice = choices[choices.length - 1]
  const questions = [
    {
      type: 'list',
      name: 'choice',
      message: 'What do you want to do?',
      choices: choices
    },
    {
      type: 'input',
      name: 'to_number',
      message: 'Enter the number to call:',
      when: ({ choice }) => choice === choices[1] || choice === choices[2],
      default: () => '2083660792'
    },
    {
      type: 'input',
      name: 'connect_to_number',
      message: 'Enter the number to connect the answered call:',
      when: ({ choice }) => choice === choices[1],
      default: () => '2083660792'
    },
    {
      type: 'input',
      name: 'tts_to_play',
      message: 'Enter TTS to play:',
      when: ({ choice }) => choice === choices[2],
      default: () => 'Hey There, Welcome at SignalWire!'
    },
    {
      type: 'input',
      name: 'context',
      message: 'Context to listen on:',
      when: ({ choice }) => choice === choices[3]
    }
  ]
  inquirer.prompt(questions).then(async answers => {
    if (answers.choice === exitChoice) {
      return process.exit()
    }
    if (!answers.to_number && !answers.context) {
      return _init()
    }

    if (answers.to_number) {
      const call = await makeCall(answers.to_number)

      if (answers.connect_to_number) {
        call.on('answered', call => {
          call.connect(answers.connect_to_number).then(() => {
            console.log(`\tCall connected?`)
          })
        })
      }

      if (answers.tts_to_play) {
        call.on('answered', call => {
          call.playTTS({ text: answers.tts_to_play} ).then(() => {
            console.log(`\t TTS received?`)
          })
        })
      }
      console.warn(`\tCall to ${answers.to_number} starts now!\n`)
      call.begin()

    } else if (answers.context) {
      await client.calling.onInbound(answers.context, call => {
        console.warn(`Inbound call on "${call.context}"`, call)
      })
      console.log(`Listener for ${answers.context} started..\n`)
      return _init()
    }
  })
}
