const AWS = require('aws-sdk');

const TOPIC = process.env.TOPIC;

exports.handler = async function (event) {
    console.log('start function to notify that shopping is done')
    console.log(event);

    console.log(event.identity);
    console.log(event.identity.claims);

    const email = event.identity.claims.email;
    console.log(email);

    const params = {
        Message: `${email} just finished doing the shopping`, 
        TopicArn: TOPIC
      };
    
    try {
        const publishText = await AWS.SNS.publish(params).promise();
        console.log(publishText)
    } catch (e) {
        console.log(e);
    }
      
    return []
  };
 