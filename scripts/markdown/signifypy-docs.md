:::::::::::::::::::: {.document role="main" itemscope="itemscope" itemtype="http://schema.org/Article"}
::::::::::::::::::: {itemprop="articleBody"}
::::: {#welcome-to-signifypy-s-documentation .section}
# Welcome to Signifypy's documentation\![¶](#welcome-to-signifypy-s-documentation "Link to this heading"){.headerlink}

:::: {.toctree-wrapper .compound}
[]{#document-README}

::: {#signifypy .section}
## Signifypy[¶](#signifypy "Link to this heading"){.headerlink}

Signify implementation in Python
:::
::::
:::::

:::::::::::::: {#api-reference .section}
# API Reference[¶](#api-reference "Link to this heading"){.headerlink}

::::::::::::: {.toctree-wrapper .compound}
[]{#document-signify_app}

::::::::: {#signify-app-api .section}
## Signify App API[¶](#signify-app-api "Link to this heading"){.headerlink}

::: {#module-signify.app.aiding .section}
[]{#signify-app-aiding}

### signify.app.aiding[¶](#module-signify.app.aiding "Link to this heading"){.headerlink}

SIGNIFY signify.app.aiding module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.aiding.]{.pre}]{.sig-prename .descclassname}[[Identifiers]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.aiding.Identifiers "Link to this definition"){.headerlink}

:   Domain class for accessing, creating and rotating KERI Autonomic
    IDentifiers (AIDs)
:::

::: {#module-signify.app.clienting .section}
[]{#signify-app-clienting}

### signify.app.clienting[¶](#module-signify.app.clienting "Link to this heading"){.headerlink}

Signify signify.app.clienting module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.clienting.]{.pre}]{.sig-prename .descclassname}[[SignifyAuth]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[authn]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.app.clienting.SignifyAuth "Link to this definition"){.headerlink}

:   

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.clienting.]{.pre}]{.sig-prename .descclassname}[[SignifyClient]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[passcode]{.pre}]{.n}*, *[[url]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[boot_url]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[tier]{.pre}]{.n}[[=]{.pre}]{.o}[[\'low\']{.pre}]{.default_value}*, *[[extern_modules]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.app.clienting.SignifyClient "Link to this definition"){.headerlink}

:   An edge signing client representing a delegator AID connected to the
    delegated agent in a KERA instance.

    [[boot]{.pre}]{.sig-name .descname}[(]{.sig-paren}[)]{.sig-paren} [[→]{.sig-return-icon} [[dict]{.pre}]{.sig-return-typehint}]{.sig-return}[¶](#signify.app.clienting.SignifyClient.boot "Link to this definition"){.headerlink}

    :   Call a KERIA server to create an Agent that is delegated to by
        this AID to be its authorized agent.

    [[connect]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[url]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.app.clienting.SignifyClient.connect "Link to this definition"){.headerlink}

    :   Approve the delegation from this SignifyClient's Controller AID
        to the agent AID assigned by the remote KERIA server to this
        Signify controller.
:::

::: {#module-signify.app.coring .section}
[]{#signify-app-coring}

### signify.app.coring[¶](#module-signify.app.coring "Link to this heading"){.headerlink}

SIGNIFY signify.app.coring module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.coring.]{.pre}]{.sig-prename .descclassname}[[KeyEvents]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.coring.KeyEvents "Link to this definition"){.headerlink}

:   Domain class for accessing KeyEvents

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.coring.]{.pre}]{.sig-prename .descclassname}[[KeyStates]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.coring.KeyStates "Link to this definition"){.headerlink}

:   Domain class for accessing KeyStates

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.coring.]{.pre}]{.sig-prename .descclassname}[[Oobis]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.coring.Oobis "Link to this definition"){.headerlink}

:   Domain class for accessing OOBIs

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.coring.]{.pre}]{.sig-prename .descclassname}[[Operations]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.coring.Operations "Link to this definition"){.headerlink}

:   Domain class for accessing long running operations
:::

::: {#module-signify.app.credentialing .section}
[]{#signify-app-credentialing}

### signify.app.credentialing[¶](#module-signify.app.credentialing "Link to this heading"){.headerlink}

SIGNIFY signify.app.credentialing module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.credentialing.]{.pre}]{.sig-prename .descclassname}[[CredentialTypeage]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[issued]{.pre}]{.n}*, *[[received]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.app.credentialing.CredentialTypeage "Link to this definition"){.headerlink}

:   

    [[issued]{.pre}]{.sig-name .descname}[¶](#signify.app.credentialing.CredentialTypeage.issued "Link to this definition"){.headerlink}

    :   Alias for field number 0

    [[received]{.pre}]{.sig-name .descname}[¶](#signify.app.credentialing.CredentialTypeage.received "Link to this definition"){.headerlink}

    :   Alias for field number 1

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.credentialing.]{.pre}]{.sig-prename .descclassname}[[Credentials]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.credentialing.Credentials "Link to this definition"){.headerlink}

:   Domain class for accessing, presenting, issuing and revoking
    credentials

    [[create]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[hab]{.pre}]{.n}*, *[[registry]{.pre}]{.n}*, *[[data]{.pre}]{.n}*, *[[schema]{.pre}]{.n}*, *[[recipient]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[edges]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[rules]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[private]{.pre}]{.n}[[=]{.pre}]{.o}[[False]{.pre}]{.default_value}*, *[[timestamp]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.app.credentialing.Credentials.create "Link to this definition"){.headerlink}

    :   Create and submit a credential

        Parameters[:]{.colon}

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

    [[export]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[said]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.app.credentialing.Credentials.export "Link to this definition"){.headerlink}

    :   

        Parameters[:]{.colon}

        :   **said** (*str*) -- SAID of credential to export

        Returns[:]{.colon}

        :   exported credential

        Return type[:]{.colon}

        :   credential (bytes)

    [[list]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[filtr]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[sort]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[skip]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[limit]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.app.credentialing.Credentials.list "Link to this definition"){.headerlink}

    :   

        Parameters[:]{.colon}

        :   - **filtr** (*dict*) -- Credential filter dict

            - **sort** (*list*) -- list of SAD Path field references to
              sort by

            - **skip** (*int*) -- number of credentials to skip at the
              front of the list

            - **limit** (*int*) -- total number of credentials to
              retrieve

        Returns[:]{.colon}

        :   list of dicts representing the listed credentials

        Return type[:]{.colon}

        :   list
:::

::: {#module-signify.app.ending .section}
[]{#signify-app-ending}

### signify.app.ending[¶](#module-signify.app.ending "Link to this heading"){.headerlink}

SIGNIFY signify.app.ending module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.ending.]{.pre}]{.sig-prename .descclassname}[[EndRoleAuthorizations]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.ending.EndRoleAuthorizations "Link to this definition"){.headerlink}

:   Domain class for accessing Endpoint Role Authorizations
:::

::: {#module-signify.app.escrowing .section}
[]{#signify-app-escrowing}

### signify.app.escrowing[¶](#module-signify.app.escrowing "Link to this heading"){.headerlink}

SIGNIFY signify.app.escrowing module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.app.escrowing.]{.pre}]{.sig-prename .descclassname}[[Escrows]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[client]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[[SignifyClient]{.pre}](#document-signify_app#signify.app.clienting.SignifyClient "signify.app.clienting.SignifyClient"){.reference .internal}]{.n}*[)]{.sig-paren}[¶](#signify.app.escrowing.Escrows "Link to this definition"){.headerlink}

:   Domain class for accessing event escrows in your Agent
:::
:::::::::

[]{#document-signify_core}

::::: {#signify-core-api .section}
## Signify Core API[¶](#signify-core-api "Link to this heading"){.headerlink}

::: {#module-signify.core.authing .section}
[]{#signify-core-authing}

### signify.core.authing[¶](#module-signify.core.authing "Link to this heading"){.headerlink}

SIGNIFY signify.core.authing module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.authing.]{.pre}]{.sig-prename .descclassname}[[Agent]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[state]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.core.authing.Agent "Link to this definition"){.headerlink}

:   Agent class representing a KERIA agent delegated to by a Signify
    controller Client AID (caid).

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.authing.]{.pre}]{.sig-prename .descclassname}[[Controller]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[bran]{.pre}]{.n}*, *[[tier]{.pre}]{.n}*, *[[state]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.core.authing.Controller "Link to this definition"){.headerlink}

:   Controller class representing a Signify controller Client AID (caid)
    that delegates to a KERIA Agent AID.

    [[rotate]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[nbran]{.pre}]{.n}*, *[[aids]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.core.authing.Controller.rotate "Link to this definition"){.headerlink}

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

        Parameters[:]{.colon}

        :   - **nbran** (*str*) -- new passcode to use for re-encryption

            - **aids** (*list*) -- all AIDs from the agent
:::

::: {#module-signify.core.keeping .section}
[]{#signify-core-keeping}

### signify.core.keeping[¶](#module-signify.core.keeping "Link to this heading"){.headerlink}

SIGNIFY signify.core.keeping module

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.keeping.]{.pre}]{.sig-prename .descclassname}[[BaseKeeper]{.pre}]{.sig-name .descname}[¶](#signify.core.keeping.BaseKeeper "Link to this definition"){.headerlink}

:   Base Keystore class for all Keeper types

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.keeping.]{.pre}]{.sig-prename .descclassname}[[GroupKeeper]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[mgr]{.pre}]{.n}[[:]{.pre}]{.p}[ ]{.w}[[Manager]{.pre}]{.n}*, *[[mhab]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[states]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[rstates]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[keys]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[ndigs]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.core.keeping.GroupKeeper "Link to this definition"){.headerlink}

:   

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.keeping.]{.pre}]{.sig-prename .descclassname}[[RandyKeeper]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[salter]{.pre}]{.n}*, *[[code]{.pre}]{.n}[[=]{.pre}]{.o}[[\'A\']{.pre}]{.default_value}*, *[[count]{.pre}]{.n}[[=]{.pre}]{.o}[[1]{.pre}]{.default_value}*, *[[icodes]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[transferable]{.pre}]{.n}[[=]{.pre}]{.o}[[False]{.pre}]{.default_value}*, *[[ncode]{.pre}]{.n}[[=]{.pre}]{.o}[[\'A\']{.pre}]{.default_value}*, *[[ncount]{.pre}]{.n}[[=]{.pre}]{.o}[[1]{.pre}]{.default_value}*, *[[ncodes]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[dcode]{.pre}]{.n}[[=]{.pre}]{.o}[[\'E\']{.pre}]{.default_value}*, *[[prxs]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[nxts]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.core.keeping.RandyKeeper "Link to this definition"){.headerlink}

:   

<!-- -->

[[[class]{.pre}]{.k}[ ]{.w}]{.property}[[signify.core.keeping.]{.pre}]{.sig-prename .descclassname}[[SaltyKeeper]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[salter]{.pre}]{.n}*, *[[pidx]{.pre}]{.n}*, *[[kidx]{.pre}]{.n}[[=]{.pre}]{.o}[[0]{.pre}]{.default_value}*, *[[tier]{.pre}]{.n}[[=]{.pre}]{.o}[[\'low\']{.pre}]{.default_value}*, *[[transferable]{.pre}]{.n}[[=]{.pre}]{.o}[[False]{.pre}]{.default_value}*, *[[stem]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[code]{.pre}]{.n}[[=]{.pre}]{.o}[[\'A\']{.pre}]{.default_value}*, *[[count]{.pre}]{.n}[[=]{.pre}]{.o}[[1]{.pre}]{.default_value}*, *[[icodes]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[ncode]{.pre}]{.n}[[=]{.pre}]{.o}[[\'A\']{.pre}]{.default_value}*, *[[ncount]{.pre}]{.n}[[=]{.pre}]{.o}[[1]{.pre}]{.default_value}*, *[[ncodes]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[dcode]{.pre}]{.n}[[=]{.pre}]{.o}[[\'E\']{.pre}]{.default_value}*, *[[bran]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[sxlt]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.core.keeping.SaltyKeeper "Link to this definition"){.headerlink}

:   Keeper class for managing keys for an AID that uses a hierarchical
    deterministic key chain with a salt per AID. The passcode is used as
    an encryption key to encrypt and store the AID's salt on the server.
    This class can either be instantiated with an encrypted salt or None
    which will create a random salt for this AID.

    [[incept]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[transferable]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.core.keeping.SaltyKeeper.incept "Link to this definition"){.headerlink}

    :   Create verfers and digers for inception event for AID
        represented by this Keeper

        Parameters[:]{.colon}

        :   **transferable** (*bool*) -- True if the AID for this keeper
            can establish new keys

        Returns[:]{.colon}

        :   qualified base64 of signing public keys digers(list):
            qualified base64 of hash of rotation public keys

        Return type[:]{.colon}

        :   verfers(list)

    [[params]{.pre}]{.sig-name .descname}[(]{.sig-paren}[)]{.sig-paren}[¶](#signify.core.keeping.SaltyKeeper.params "Link to this definition"){.headerlink}

    :   Get AID parameters to store externally

    [[rotate]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[ncodes]{.pre}]{.n}*, *[[transferable]{.pre}]{.n}*, *[[\*\*]{.pre}]{.o}[[\_]{.pre}]{.n}*[)]{.sig-paren}[¶](#signify.core.keeping.SaltyKeeper.rotate "Link to this definition"){.headerlink}

    :   Rotate and return verfers and digers for next rotation event for
        AID represented by this Keeper

        Parameters[:]{.colon}

        :   - **ncodes** (*list*)

            - **transferable** (*bool*) -- derivation codes for rotation
              key creation

        Returns[:]{.colon}

        :   qualified base64 of signing public keys digers(list):
            qualified base64 of hash of rotation public keys

        Return type[:]{.colon}

        :   verfers(list)

    [[sign]{.pre}]{.sig-name .descname}[(]{.sig-paren}*[[ser]{.pre}]{.n}*, *[[indexed]{.pre}]{.n}[[=]{.pre}]{.o}[[True]{.pre}]{.default_value}*, *[[indices]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*, *[[ondices]{.pre}]{.n}[[=]{.pre}]{.o}[[None]{.pre}]{.default_value}*[)]{.sig-paren}[¶](#signify.core.keeping.SaltyKeeper.sign "Link to this definition"){.headerlink}

    :   Sign provided data using the current signing keys for AID

        Parameters[:]{.colon}

        :   - **ser** (*bytes*) -- data to sign

            - **indexed** (*bool*) -- True indicates the signatures are
              to be indexed signatures (indexed code)

            - **indices** (*list*) -- specified signing indicies for
              each signature generated

            - **ondices** (*list*) -- specified rotation indicies for
              each signature generated

        Returns[:]{.colon}

        :   qualified b64 CESR encoded signatures

        Return type[:]{.colon}

        :   list
:::
:::::
:::::::::::::
::::::::::::::

::: {#indices-and-tables .section}
# Indices and tables[¶](#indices-and-tables "Link to this heading"){.headerlink}

- [[Index]{.std .std-ref}](genindex.html){.reference .internal}

- [[Module Index]{.std .std-ref}](py-modindex.html){.reference
  .internal}

- [[Search Page]{.std .std-ref}](search.html){.reference .internal}
:::
:::::::::::::::::::
::::::::::::::::::::
