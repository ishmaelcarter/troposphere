import React from 'react';
import BootstrapModalMixin from 'components/mixins/BootstrapModalMixin.react';
import stores from 'stores';

export default React.createClass({

    getInitialState: function() {
        return {
            keyName: '',
            pubKey: '',
            errorMsg: '',
        }
    },

    mixins: [BootstrapModalMixin],

    updateKeyName: function(event) {
        this.setState({
            'keyName': event.target.value.trim()
        });
    },

    updatePublicKey: function(event) {
        // Rule out most whitespace issues
        let key = event.target.value.trim();

        let parts = key.split(/\s+/g);
        let err = '';

        if (!this.validateKeyType(parts[0])) {
            err = 'Public key must begin with either ssh-rsa, ssh-dss, ecdsa-sha2-nistp256, or ssh-ed25519';
        } else if (!this.validateOneLine(key)) {
            err = 'Public key cannot contain line breaks';
        } else if (!this.validateNumOfParts(key)) {
            err = 'Public key can only contain 2 or 3 parts';
        } else if (!this.validateKeyBodyBase64(parts[1])) {
            err = 'The key contains illegal characters';
        }

        this.setState({
            'pubKey': key,
            'errorMsg': err
        });
    },

    componentDidMount: function() {
        stores.SSHKeyStore.addChangeListener(this.updateState);
    },

    componentWillUnmount: function() {
        stores.SSHKeyStore.removeChangeListener(this.getInitialState);
    },

    validateKeyType: function(firstWord) {
        // Worth noting that `ssh-keygen -t dsa` creates a key beginning with `ssh-dss`
        return /^(ssh-dss|ecdsa-sha2-nistp256|ssh-ed25519|ssh-rsa)$/.test(firstWord);
    },

    validateOneLine: function(key) {
        return /^[^\n]*$/.test(key);
    },

    validateNumOfParts: function(key) {
        // Key must be space delimited
        let parts = key.split(/ +/);

        // 3 parts if a comment is included
        return parts.length == 2 || parts.length == 3;
    },

    validateKeyBodyBase64: function(secondPart) {
        return /^[a-zA-Z0-9+/=]+$/.test(secondPart);
    },

    validateKey: function() {
        let parts = this.state.pubKey.split(/\s+/g);

        return this.validateKeyType(parts[0]) &&
        this.validateNumOfParts(this.state.pubKey) &&
        this.validateOneLine(this.state.pubKey) &&
        this.validateKeyBodyBase64(parts[1]);
    },

    isSubmittable() {
        return this.validateKey() && this.state.keyName.length > 0;
    },

    addPublicKey: function() {
        stores.SSHKeyStore.models.create({
            atmo_user: this.props.user,
            name: this.state.keyName,
            pub_key: this.state.pubKey,
        }, {
            success: function() {
                stores.SSHKeyStore.emitChange();
            },
        });
    },

    onSubmit: function() {
        this.addPublicKey();
        this.hide();
    },

    render: function() {
        // Only show the warning if the field has content
        let showKeyWarn = !this.validateKey() && this.state.pubKey.length > 0;
        let notSubmittable = !this.isSubmittable();

        return (
        <div className="modal fade">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        { this.renderCloseButton() }
                        <strong>Add a public SSH key</strong>
                    </div>
                    <div style={ { minHeight: '300px' } } className="modal-body">
                        <div className='form-group'>
                            <label className="control-label">
                                Key Name
                            </label>
                            <div>
                                <input type="text" className="form-control" onChange={ this.updateKeyName } />
                            </div>
                        </div>
                        <div>
                            <label className="control-label">
                                Public Key
                            </label>
                            <div aria-invalid={ showKeyWarn } className={ 'form-group ' + (showKeyWarn ? 'has-error' : '') }>
                                <textarea placeholder="Begins with either ssh-rsa, ssh-dss, ..."
                                          style={ { minHeight: '200px' } }
                                          className="form-control"
                                          onChange={ this.updatePublicKey } />
                                { showKeyWarn ? <span className="help-block">{ '* ' + this.state.errorMsg }</span> : '' }
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-danger" onClick={ this.hide }>
                            Cancel
                        </button>
                        <button type="button"
                                aria-invalid={ notSubmittable }
                                className="btn btn-primary"
                                onClick={ this.onSubmit }
                                disabled={ notSubmittable }>
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </div>
        );
    }

});
