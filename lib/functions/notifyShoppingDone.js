const AWS = require('aws-sdk');
var sns = new AWS.SNS();

const TOPIC = process.env.TOPIC;

exports.handler = async function (event) {
    console.log('start function to notify that shopping is done')
    //console.log(event);

    const email = event.identity.claims.email;
    console.log(email);

    const params = {
        Message: `${email} just finished doing the shopping`, 
        TopicArn: TOPIC
      };
    
    try {
        const publishText = await sns.publish(params).promise();
        console.log(publishText)
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
  };
 