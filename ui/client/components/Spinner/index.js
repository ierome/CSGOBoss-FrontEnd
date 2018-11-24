
import React from 'react'
import UIkit from 'uikit'

class Spinner extends React.Component {
  componentDidMount() {

    console.log(UIkit.spinner(this.refs.spinner))

  }

  render() {
    const { size, style, ...otherProps } = this.props

    let styles = {
      ...style,
      width: size,
      height: size
    }

    return (
      <span ref="spinner" style={styles} {...otherProps} />
    )
  }
}

Spinner.defaultProps = {
  style: {},
  width: 30
}

export default Spinner
