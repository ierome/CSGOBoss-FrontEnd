
import React from 'react'
import UIkit from 'uikit'

export default class Modal extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this._modal = UIkit.modal(this.refs.modal, {
      container: false,
      center: true
      // stack: true
    })

    this._modal.$el.on('hide', () => {
      this.props.onHide()
    })

    this._modal._callReady()

    if(this.props.visible) {
      this._modal.show()
    }
  }

  componentWillReceiveProps(nextProps) {
    const { visible } = nextProps
    if(this.props.visible !== visible) {
      if(visible) {
        this._modal.show()
      } else {
        this._modal.hide()
      }
    }
  }

  render() {
    return (
      <div ref="modal">
        {this.props.children}
      </div>
    )
  }
}
