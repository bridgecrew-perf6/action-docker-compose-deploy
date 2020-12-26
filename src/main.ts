import * as core from '@actions/core'
import {SshService} from './service/ssh.service'
import * as fs from 'fs'

async function run(): Promise<void> {
  try {
    const sshService = new SshService()
    const sha8 = core.getInput('sha8')
    let dockerComposeProd = fs.readFileSync(
      `${process.env.GITHUB_WORKSPACE}/docker-compose.prod`,
      `utf8`
    )
    dockerComposeProd = dockerComposeProd.replace(':DOCKER_TAG', sha8)
    core.info(`Writing docker-compose.yml.`)
    fs.writeFileSync(
      `${process.env.GITHUB_WORKSPACE}/docker-compose.${sha8}.yml`,
      dockerComposeProd
    )
    await sshService.connect()
    core.info(`Copy file to remote server`)
    await sshService.putFile(
      `${process.env.GITHUB_WORKSPACE}/docker-compose.${sha8}.yml`,
      `/home/gha/docker-compose.${sha8}.yml`
    )
    core.info(`Deploy stack`)
    const repo = `${process.env.GITHUB_REPOSITORY}`.split('/').pop()
    const response = await sshService.execCommand(
      `docker stack deploy --compose-file /home/gha/docker-compose.${sha8}.yml ${repo}`
    )
    core.info(JSON.stringify(response))
    await sshService.dispose()
    core.setOutput('time', new Date().toTimeString())

    return
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
