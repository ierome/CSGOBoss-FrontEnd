
import React, { Component } from 'react'
import style from './style.css'

export default class Shop extends Component {
  render() {
    return (
      <div className="container-fluid">
        <div className={style.container}>
          <h1>Frequently Asked Questions</h1>
          <h3>How can I get in contact with you?</h3>
          <p>You can contact us via twitter <a href="https://twitter.com/CSGO_BOSS" target="_blank">@CSGO_BOSS</a></p>
          <h3>How can I get tokens?</h3>
          <p>We only accept tokens from our partner <a href="http://www.sknexchange.com" target="_blank">SknExchange</a>. You can withdraw and deposit from their site.</p>
          <h3>How do I see how many tokens I have played?</h3>
          <p>You can see how many tokens you've played by heading to the chat and typing the command <b>/stats</b></p>
          <h3>I'm a streamer/youtuber, how can I get a sponsership?</h3>
          <p>So you want to make videos for CSGOBoss and earn at the same time? Awesome! Right now we are only accepting youtubers with ~10k+ subs. Contact us for more information.</p>
          <h3>How do I withdraw?</h3>
          <ol>
            <li>Visit SknExchange and click on Transfer Tokens.</li>
            <li>Type in the amount of tokens you want to withdraw from CSGOBoss and send to SknExchange.</li>
            <li>Then click Withdraw (Whatever amount you typed) Tokens.</li>
            <li>You now have balance in your SknExchange account and can withdraw any skin that is on SknExchange!</li>
          </ol>
          <h3>How do I deposit?</h3>
          If you already have deposited on SknExchange, Then skip to step 3.
          <ol>
            <li>Go to SknExchange and click Exchange Your Skins and deposit your skins there.</li>
            <li>After you have successfully deposited your skins, Click on Transfer Tokens.</li>
            <li>Type in the amount of tokens you want to deposit on CSGOBoss and transfer from SknExchange.</li>
            <li>Then click Transfer (Whatever amount you typed) Tokens.</li>
            <li>You now have balance in your CSGOBoss account and can get to winning some more tokens!</li>
          </ol>
        </div>
      </div>
    )
  }
}
