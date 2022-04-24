import Big from 'big.js'
import { providers, utils } from 'near-api-js'
import PropTypes from 'prop-types'
import React, { useCallback, useEffect, useState } from 'react'
import 'regenerator-runtime/runtime'
import Form from './components/Form'
import Messages from './components/Messages'
import SignIn from './components/SignIn'
import { useWalletSelector } from './contexts/WalletSelectorContext'

const SUGGESTED_DONATION = '0'
const BOATLOAD_OF_GAS = Big(3)
  .times(10 ** 13)
  .toFixed()

const App = () => {
  const { selector, accountId } = useWalletSelector()
  const [messages, setMessages] = useState([])

  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(false)

  const getAccount = useCallback(async () => {
    if (!accountId) {
      return null
    }

    const { nodeUrl } = selector.network
    const provider = new providers.JsonRpcProvider({ url: nodeUrl })

    return provider
      .query({
        request_type: 'view_account',
        finality: 'final',
        account_id: accountId,
      })
      .then((data) => ({
        ...data,
        account_id: accountId,
      }))
  }, [accountId, selector.network])

  const getMessages = useCallback(() => {
    const provider = new providers.JsonRpcProvider({
      url: selector.network.nodeUrl,
    })

    return provider
      .query({
        request_type: 'call_function',
        account_id: selector.getContractId(),
        method_name: 'getMessages',
        args_base64: '',
        finality: 'optimistic',
      })
      .then((res) => JSON.parse(Buffer.from(res.result).toString()))
  }, [selector])

  useEffect(() => {
    getMessages().then(setMessages)
  }, [])

  useEffect(() => {
    if (!accountId) {
      return setAccount(null)
    }

    setLoading(true)

    getAccount().then((nextAccount) => {
      setAccount({ ...nextAccount, accountId: nextAccount.account_id })
      setLoading(false)
    })
  }, [accountId, getAccount])

  const onSubmit = useCallback(
    (e) => {
      e.preventDefault()

      const { fieldset, message, donation } = e.target.elements

      fieldset.disabled = true

      selector
        .signAndSendTransaction({
          signerId: accountId,
          actions: [
            {
              type: 'FunctionCall',
              params: {
                methodName: 'addMessage',
                args: { text: message.value },
                gas: BOATLOAD_OF_GAS,
                deposit: utils.format.parseNearAmount(donation.value || '0'),
              },
            },
          ],
        })
        .catch((err) => {
          alert('Failed to add message')
          console.log('Failed to add message')

          throw err
        })
        .then(() => {
          return getMessages()
            .then((nextMessages) => {
              setMessages(nextMessages)
              message.value = ''
              donation.value = SUGGESTED_DONATION
              fieldset.disabled = false
              message.focus()
            })
            .catch((err) => {
              alert('Failed to refresh messages')
              console.log('Failed to refresh messages')

              throw err
            })
        })
        .catch((err) => {
          console.error(err)

          fieldset.disabled = false
        })
    },
    [selector, accountId, getMessages],
  )

  const signIn = () => {
    selector.show()
  }

  const signOut = () => {
    selector.signOut().catch((err) => {
      console.log('Failed to sign out')
      console.error(err)
    })
  }

  if (loading) {
    return null
  }

  if (!account) {
    return (
      <main>
        <header>
          <h1>NEAR Guest Book</h1>
          <button onClick={signIn}>Log in</button>
        </header>
        <SignIn />
      </main>
    )
  }

  return (
    <main>
      <header>
        <h1>NEAR Guest Book</h1>
        <button onClick={signOut}>Log out</button>
      </header>
      {account && account.accountId && (
        <Form onSubmit={onSubmit} currentUser={account} />
      )}
      {!!account && !!messages.length && <Messages messages={messages} />}
    </main>
  )
}

App.propTypes = {
  contract: PropTypes.shape({
    addMessage: PropTypes.func.isRequired,
    getMessages: PropTypes.func.isRequired,
  }).isRequired,
  currentUser: PropTypes.shape({
    accountId: PropTypes.string.isRequired,
    balance: PropTypes.string.isRequired,
  }),
  nearConfig: PropTypes.shape({
    contractName: PropTypes.string.isRequired,
  }).isRequired,
  wallet: PropTypes.shape({
    requestSignIn: PropTypes.func.isRequired,
    signOut: PropTypes.func.isRequired,
  }).isRequired,
}

export default App
