  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyStaticCronJob() {
    const users = await this.manager
      .getRepository(User)
      .createQueryBuilder('User')
      .leftJoinAndSelect('User.userProfile', 'UserProfile')
      .leftJoinAndSelect('User.senderContact', 'UserContactSender')
      .leftJoinAndSelect('User.receiverContact', 'UserContactReceiver')
      .leftJoinAndSelect('User.vaults', 'UserVault')
      .leftJoinAndSelect('User.userType', 'UserType')
      .getMany();
    let noOfConfirmedTrustee = 0,
      noOfPotentialTrustee = 0,
      totalVaultCount = 0,
      totalRegisterUserIn24Hr = 0,
      totalRegisteredUserCount = users.length;
    const noOfVaultOfUser = [],
      userType = [],
      totalConfirmedTrustee = [],
      totalPotentialTrustee = [],
      result = [];
    try {
      const newDate = futureDateFromToday(0, 0, -1, 0, 0, 0);
      const userProfile = users[0].userProfile;
      for (const [i, user] of users.entries()) {
        noOfVaultOfUser.push(user.vaults.length);
        totalVaultCount = totalVaultCount + user.vaults.length;
        [noOfConfirmedTrustee, noOfPotentialTrustee] = this.checkConfirmedOrPotential(
          user.receiverContact,
          noOfConfirmedTrustee,
          noOfPotentialTrustee
        );
        [noOfConfirmedTrustee, noOfPotentialTrustee] = this.checkConfirmedOrPotential(user.senderContact, noOfConfirmedTrustee, noOfPotentialTrustee);
        if (user.createdDate > newDate) {
          totalRegisterUserIn24Hr = totalRegisterUserIn24Hr + 1;
        }
        userType.push(user.userType.id);
        totalConfirmedTrustee.push(noOfConfirmedTrustee);
        totalPotentialTrustee.push(noOfPotentialTrustee);
        noOfConfirmedTrustee = 0;
        noOfPotentialTrustee = 0;
        delete user.senderContact;
        delete user.receiverContact;
        delete user.vaults;
        delete user.password;
        delete user.userType;
        result.push({
          total_Registered_User_Count: totalRegisteredUserCount,
          total_Vault_Count: totalVaultCount,
          total_Register_User_In_24_Hr: totalRegisterUserIn24Hr,
          firstName: user.userProfile.firstName,
          lastName: user.userProfile.lastName,
          email: user.email,
          id: user.id,
          userTypeId: user.userTypeId,
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId,
          userRegistrationDate: user.userRegistrationDate,
          lastLoggedIn: user.lastLoggedIn,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          rememberOtpForSevenDays: user.rememberOtpForSevenDays,
          createdDate: user.createdDate,
          updatedDate: user.updatedDate,
          isWillPaid: user.isWillPaid,
          isSubscriptionActive: user.isSubscriptionActive,
          no_Of_Vault_Of_User: noOfVaultOfUser[i],
          total_Confirmed_Trustee: totalConfirmedTrustee[i],
          total_Potential_Trustee: totalPotentialTrustee[i],
          userType: userType[i],
        });
        totalVaultCount = 0;
        totalRegisterUserIn24Hr = 0;
        totalRegisteredUserCount = 0;
      }
      const csv = await json2csvAsync(result);
      this.notificationService.sendNotificationOnPermissionBasis(
        userProfile,
        emailTypeConstant.DAILY_REPORT,
        { user: { email: this.configService.get('DAILY_REPORT_SENT_TO') } },
        csv
      );
    } catch (e) {
      throw new ExceptionInReport(CustomApplicationFailMessageConstant.exception_in_report);
    }
  }
