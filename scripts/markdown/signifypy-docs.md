# Welcome to Signifypy's documentation\![¶](#welcome-to-signifypy-s-documentation "Link to this heading")

[]

## Signifypy[¶](#signifypy "Link to this heading")

Signify implementation in Python

# API Reference[¶](#api-reference "Link to this heading")

[]

## Signify App API[¶](#signify-app-api "Link to this heading")

[]

### signify.app.aiding[¶](#module-signify.app.aiding "Link to this heading")

SIGNIFY signify.app.aiding module

[[[class]][ ]][[signify.app.aiding.]][[Identifiers]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.aiding.Identifiers "Link to this definition")

:   Domain class for accessing, creating and rotating KERI Autonomic
    IDentifiers (AIDs)

[]

### signify.app.clienting[¶](#module-signify.app.clienting "Link to this heading")

Signify signify.app.clienting module

[[[class]][ ]][[signify.app.clienting.]][[SignifyAuth]][(]*[[authn]]*[)][¶](#signify.app.clienting.SignifyAuth "Link to this definition")

:

<!-- -->

[[[class]][ ]][[signify.app.clienting.]][[SignifyClient]][(]*[[passcode]]*, *[[url]][[=]][[None]]*, *[[boot_url]][[=]][[None]]*, *[[tier]][[=]][[\'low\']]*, *[[extern_modules]][[=]][[None]]*[)][¶](#signify.app.clienting.SignifyClient "Link to this definition")

:   An edge signing client representing a delegator AID connected to the
    delegated agent in a KERA instance.

    [[boot]][(][)] [[→] [[dict]]][¶](#signify.app.clienting.SignifyClient.boot "Link to this definition")

    :   Call a KERIA server to create an Agent that is delegated to by
        this AID to be its authorized agent.

    [[connect]][(]*[[url]][[=]][[None]]*[)][¶](#signify.app.clienting.SignifyClient.connect "Link to this definition")

    :   Approve the delegation from this SignifyClient's Controller AID
        to the agent AID assigned by the remote KERIA server to this
        Signify controller.

[]

### signify.app.coring[¶](#module-signify.app.coring "Link to this heading")

SIGNIFY signify.app.coring module

[[[class]][ ]][[signify.app.coring.]][[KeyEvents]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.coring.KeyEvents "Link to this definition")

:   Domain class for accessing KeyEvents

<!-- -->

[[[class]][ ]][[signify.app.coring.]][[KeyStates]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.coring.KeyStates "Link to this definition")

:   Domain class for accessing KeyStates

<!-- -->

[[[class]][ ]][[signify.app.coring.]][[Oobis]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.coring.Oobis "Link to this definition")

:   Domain class for accessing OOBIs

<!-- -->

[[[class]][ ]][[signify.app.coring.]][[Operations]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.coring.Operations "Link to this definition")

:   Domain class for accessing long running operations

[]

### signify.app.credentialing[¶](#module-signify.app.credentialing "Link to this heading")

SIGNIFY signify.app.credentialing module

[[[class]][ ]][[signify.app.credentialing.]][[CredentialTypeage]][(]*[[issued]]*, *[[received]]*[)][¶](#signify.app.credentialing.CredentialTypeage "Link to this definition")

:

    [[issued]][¶](#signify.app.credentialing.CredentialTypeage.issued "Link to this definition")

    :   Alias for field number 0

    [[received]][¶](#signify.app.credentialing.CredentialTypeage.received "Link to this definition")

    :   Alias for field number 1

<!-- -->

[[[class]][ ]][[signify.app.credentialing.]][[Credentials]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.credentialing.Credentials "Link to this definition")

:   Domain class for accessing, presenting, issuing and revoking
    credentials

    [[create]][(]*[[hab]]*, *[[registry]]*, *[[data]]*, *[[schema]]*, *[[recipient]][[=]][[None]]*, *[[edges]][[=]][[None]]*, *[[rules]][[=]][[None]]*, *[[private]][[=]][[False]]*, *[[timestamp]][[=]][[None]]*[)][¶](#signify.app.credentialing.Credentials.create "Link to this definition")

    :   Create and submit a credential

        Parameters[:]

        :   - **hab**

            - **registry**

            - **data**

            - **schema**

            - **recipient**

            - **edges**

            - **rules**

            - **private**

            - **timestamp**

        Returns:

    [[export]][(]*[[said]]*[)][¶](#signify.app.credentialing.Credentials.export "Link to this definition")

    :

        Parameters[:]

        :   **said** (*str*) -- SAID of credential to export

        Returns[:]

        :   exported credential

        Return type[:]

        :   credential (bytes)

    [[list]][(]*[[filtr]][[=]][[None]]*, *[[sort]][[=]][[None]]*, *[[skip]][[=]][[None]]*, *[[limit]][[=]][[None]]*[)][¶](#signify.app.credentialing.Credentials.list "Link to this definition")

    :

        Parameters[:]

        :   - **filtr** (*dict*) -- Credential filter dict

            - **sort** (*list*) -- list of SAD Path field references to
              sort by

            - **skip** (*int*) -- number of credentials to skip at the
              front of the list

            - **limit** (*int*) -- total number of credentials to
              retrieve

        Returns[:]

        :   list of dicts representing the listed credentials

        Return type[:]

        :   list

[]

### signify.app.ending[¶](#module-signify.app.ending "Link to this heading")

SIGNIFY signify.app.ending module

[[[class]][ ]][[signify.app.ending.]][[EndRoleAuthorizations]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.ending.EndRoleAuthorizations "Link to this definition")

:   Domain class for accessing Endpoint Role Authorizations

[]

### signify.app.escrowing[¶](#module-signify.app.escrowing "Link to this heading")

SIGNIFY signify.app.escrowing module

[[[class]][ ]][[signify.app.escrowing.]][[Escrows]][(]*[[client]][[:]][ ][[[SignifyClient]](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient")]*[)][¶](#signify.app.escrowing.Escrows "Link to this definition")

:   Domain class for accessing event escrows in your Agent

[]

## Signify Core API[¶](#signify-core-api "Link to this heading")

[]

### signify.core.authing[¶](#module-signify.core.authing "Link to this heading")

SIGNIFY signify.core.authing module

[[[class]][ ]][[signify.core.authing.]][[Agent]][(]*[[state]]*[)][¶](#signify.core.authing.Agent "Link to this definition")

:   Agent class representing a KERIA agent delegated to by a Signify
    controller Client AID (caid).

<!-- -->

[[[class]][ ]][[signify.core.authing.]][[Controller]][(]*[[bran]]*, *[[tier]]*, *[[state]][[=]][[None]]*[)][¶](#signify.core.authing.Controller "Link to this definition")

:   Controller class representing a Signify controller Client AID (caid)
    that delegates to a KERIA Agent AID.

    [[rotate]][(]*[[nbran]]*, *[[aids]]*[)][¶](#signify.core.authing.Controller.rotate "Link to this definition")

    :   Rotate passcode involves re-encrypting all saved AID salts for
        salty keyed AIDs and all signing priv keys and next pub/priv
        keys for randy keyed AIDs. The controller AID salt must be
        re-encrypted

        > ::: {}
        > too. The old salt must be encrypted and stored externally in
        > case key re-encryption fails halfway
        > :::

        through the procedure. The presence of an encrypted old key
        signals that recovery is needed. Otherwise, the old key
        encryption material is deleted and the current passcode is the
        only one needed. Steps:

        1.  Encrypt and save old enc salt

        2.  Rotate local Controller AID and share with Agent

        3.  Retrieve all AIDs

        4.  For each Salty AID, decrypt AID salt with old salt,
            re-encrypt with new salt, save

        5.  For each Randy AID, decrypt priv signing and next keys and
            next pub keys, re-encrypt with new passcode, save

        6.  Delete saved encrypted old enc salt

        In the event of a crash half way thru a recovery will be needed.
        That recovery process is triggered with the discovery of a saved
        encrypted old salt. When found, the following steps are needed:

        1.  Retrieve and decrypt the saved old salt for enc key

        2.  Ensure the local Conroller AID is rotated to the current new
            salt

        3.  Retrieve all AIDs

        4.  For each Salty AID, test if the AID salt is encrypted with
            old salt, re-encrypt as needed.

        5.  For each Randy AID, test if the priv signing and next keys
            and next pub keys are encrypted with old salt,

        > ::: {}
        > re-encrypt as needed.
        > :::

        6.  Delete saved encrypted old enc salt

        Parameters[:]

        :   - **nbran** (*str*) -- new passcode to use for re-encryption

            - **aids** (*list*) -- all AIDs from the agent

[]

### signify.core.keeping[¶](#module-signify.core.keeping "Link to this heading")

SIGNIFY signify.core.keeping module

[[[class]][ ]][[signify.core.keeping.]][[BaseKeeper]][¶](#signify.core.keeping.BaseKeeper "Link to this definition")

:   Base Keystore class for all Keeper types

<!-- -->

[[[class]][ ]][[signify.core.keeping.]][[GroupKeeper]][(]*[[mgr]][[:]][ ][[Manager]]*, *[[mhab]][[=]][[None]]*, *[[states]][[=]][[None]]*, *[[rstates]][[=]][[None]]*, *[[keys]][[=]][[None]]*, *[[ndigs]][[=]][[None]]*[)][¶](#signify.core.keeping.GroupKeeper "Link to this definition")

:

<!-- -->

[[[class]][ ]][[signify.core.keeping.]][[RandyKeeper]][(]*[[salter]]*, *[[code]][[=]][[\'A\']]*, *[[count]][[=]][[1]]*, *[[icodes]][[=]][[None]]*, *[[transferable]][[=]][[False]]*, *[[ncode]][[=]][[\'A\']]*, *[[ncount]][[=]][[1]]*, *[[ncodes]][[=]][[None]]*, *[[dcode]][[=]][[\'E\']]*, *[[prxs]][[=]][[None]]*, *[[nxts]][[=]][[None]]*[)][¶](#signify.core.keeping.RandyKeeper "Link to this definition")

:

<!-- -->

[[[class]][ ]][[signify.core.keeping.]][[SaltyKeeper]][(]*[[salter]]*, *[[pidx]]*, *[[kidx]][[=]][[0]]*, *[[tier]][[=]][[\'low\']]*, *[[transferable]][[=]][[False]]*, *[[stem]][[=]][[None]]*, *[[code]][[=]][[\'A\']]*, *[[count]][[=]][[1]]*, *[[icodes]][[=]][[None]]*, *[[ncode]][[=]][[\'A\']]*, *[[ncount]][[=]][[1]]*, *[[ncodes]][[=]][[None]]*, *[[dcode]][[=]][[\'E\']]*, *[[bran]][[=]][[None]]*, *[[sxlt]][[=]][[None]]*[)][¶](#signify.core.keeping.SaltyKeeper "Link to this definition")

:   Keeper class for managing keys for an AID that uses a hierarchical
    deterministic key chain with a salt per AID. The passcode is used as
    an encryption key to encrypt and store the AID's salt on the server.
    This class can either be instantiated with an encrypted salt or None
    which will create a random salt for this AID.

    [[incept]][(]*[[transferable]]*[)][¶](#signify.core.keeping.SaltyKeeper.incept "Link to this definition")

    :   Create verfers and digers for inception event for AID
        represented by this Keeper

        Parameters[:]

        :   **transferable** (*bool*) -- True if the AID for this keeper
            can establish new keys

        Returns[:]

        :   qualified base64 of signing public keys digers(list):
            qualified base64 of hash of rotation public keys

        Return type[:]

        :   verfers(list)

    [[params]][(][)][¶](#signify.core.keeping.SaltyKeeper.params "Link to this definition")

    :   Get AID parameters to store externally

    [[rotate]][(]*[[ncodes]]*, *[[transferable]]*, *[[\*\*]][[\_]]*[)][¶](#signify.core.keeping.SaltyKeeper.rotate "Link to this definition")

    :   Rotate and return verfers and digers for next rotation event for
        AID represented by this Keeper

        Parameters[:]

        :   - **ncodes** (*list*)

            - **transferable** (*bool*) -- derivation codes for rotation
              key creation

        Returns[:]

        :   qualified base64 of signing public keys digers(list):
            qualified base64 of hash of rotation public keys

        Return type[:]

        :   verfers(list)

    [[sign]][(]*[[ser]]*, *[[indexed]][[=]][[True]]*, *[[indices]][[=]][[None]]*, *[[ondices]][[=]][[None]]*[)][¶](#signify.core.keeping.SaltyKeeper.sign "Link to this definition")

    :   Sign provided data using the current signing keys for AID

        Parameters[:]

        :   - **ser** (*bytes*) -- data to sign

            - **indexed** (*bool*) -- True indicates the signatures are
              to be indexed signatures (indexed code)

            - **indices** (*list*) -- specified signing indicies for
              each signature generated

            - **ondices** (*list*) -- specified rotation indicies for
              each signature generated

        Returns[:]

        :   qualified b64 CESR encoded signatures

        Return type[:]

        :   list

# Indices and tables[¶](#indices-and-tables "Link to this heading")

- [[Index]](genindex.html)

- [[Module Index]](py-modindex.html)

- [[Search Page]](search.html)
