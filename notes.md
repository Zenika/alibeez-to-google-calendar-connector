# init flow

get / + no cookie => landing page
button click => redirect to auth
wait for callback
=> exchange token
=> fetch alibeez user
=> save user
=> place cookie
=> fetch init leaves
=> push to google
=> redirect to /

# update flow

post /update with key
=> fetch incremental leaves
=> refresh access token if needed
=> push to google

# authenticated page

get / + cookie => authenticated page

"It works! Your leaves are being synchronized. Updates happen every hour. If that's not the case, contact dreamlab@zenika.com."
