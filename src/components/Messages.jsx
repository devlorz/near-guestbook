import PropTypes from 'prop-types'
import React from 'react'

const NANO_SECOND_TIMESTAMP = 1 * 10 ** 6

export default function Messages({ messages }) {
  return (
    <>
      <h2>Messages</h2>
      {messages
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((message, i) => (
          <p key={i} className={message.premium ? 'is-premium' : ''}>
            <strong>{message.sender}</strong>:<br />
            <div>{message.text}</div>
            <div>
              {new Date(
                message.createdAt / NANO_SECOND_TIMESTAMP,
              ).toLocaleString()}
            </div>
          </p>
        ))}
    </>
  )
}

Messages.propTypes = {
  messages: PropTypes.array,
}
